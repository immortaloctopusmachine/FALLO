import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/users/[userId]/time-logs - Get time logs and stats for a user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const { userId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: Record<string, unknown> = { userId };
    if (boardId) {
      where.card = { list: { boardId } };
    }
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) (where.startTime as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.startTime as Record<string, Date>).lte = new Date(endDate);
    }

    // Get recent time logs
    const timeLogs = await prisma.timeLog.findMany({
      where,
      include: {
        card: {
          select: {
            id: true,
            title: true,
            list: {
              select: {
                id: true,
                name: true,
                board: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        list: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
      take: limit,
    });

    // Calculate stats
    const allLogs = await prisma.timeLog.findMany({
      where,
      select: {
        durationMs: true,
        startTime: true,
        list: {
          select: {
            name: true,
            phase: true,
          },
        },
      },
    });

    // Total time
    const totalMs = allLogs.reduce((sum, log) => sum + (log.durationMs || 0), 0);

    // Time by list phase
    const timeByPhase: Record<string, number> = {};
    allLogs.forEach((log) => {
      const phase = log.list.phase || 'Other';
      timeByPhase[phase] = (timeByPhase[phase] || 0) + (log.durationMs || 0);
    });

    // Time this week
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const thisWeekMs = allLogs
      .filter((log) => new Date(log.startTime) >= weekStart)
      .reduce((sum, log) => sum + (log.durationMs || 0), 0);

    // Time this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const thisMonthMs = allLogs
      .filter((log) => new Date(log.startTime) >= monthStart)
      .reduce((sum, log) => sum + (log.durationMs || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        logs: timeLogs,
        stats: {
          totalMs,
          totalFormatted: formatDuration(totalMs),
          thisWeekMs,
          thisWeekFormatted: formatDuration(thisWeekMs),
          thisMonthMs,
          thisMonthFormatted: formatDuration(thisMonthMs),
          timeByPhase: Object.entries(timeByPhase).map(([phase, ms]) => ({
            phase,
            ms,
            formatted: formatDuration(ms),
          })),
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch user time logs:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user time logs' } },
      { status: 500 }
    );
  }
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}
