import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/users/[userId]/time-logs - Get time logs and stats for a user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { userId } = await params;

    // Allow self-read, or admin access to others' logs
    if (session.user.id !== userId) {
      const adminResult = await requireAdmin(session.user.id);
      if (adminResult.response) {
        return adminResult.response;
      }
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return ApiErrors.notFound('User');
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let limit = 50;
    const limitParam = searchParams.get('limit');
    if (limitParam !== null) {
      const parsedLimit = Number.parseInt(limitParam, 10);
      if (Number.isNaN(parsedLimit)) {
        return ApiErrors.validation('limit must be an integer');
      }
      limit = Math.max(1, Math.min(parsedLimit, 100));
    }

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

    return apiSuccess({
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
    });
  } catch (error) {
    console.error('Failed to fetch user time logs:', error);
    return ApiErrors.internal('Failed to fetch user time logs');
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
