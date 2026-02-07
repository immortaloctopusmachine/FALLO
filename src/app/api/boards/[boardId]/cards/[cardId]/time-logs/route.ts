import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId]/cards/[cardId]/time-logs - Get time logs for a card
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, cardId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const timeLogs = await prisma.timeLog.findMany({
      where: { cardId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
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
    });

    // Calculate total time
    const totalMs = timeLogs.reduce((sum, log) => sum + (log.durationMs || 0), 0);

    return apiSuccess({
      logs: timeLogs,
      totalMs,
      totalFormatted: formatDuration(totalMs),
    });
  } catch (error) {
    console.error('Failed to fetch time logs:', error);
    return ApiErrors.internal('Failed to fetch time logs');
  }
}

// POST /api/boards/[boardId]/cards/[cardId]/time-logs - Create a manual time log (admin only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, cardId } = await params;

    // Check if user is admin
    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const { userId, listId, startTime, endTime, durationMs, notes } = body;

    // Validate required fields
    if (!userId || !listId) {
      return ApiErrors.validation('userId and listId are required');
    }

    // Check if card exists on this board
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        list: { boardId },
      },
    });

    if (!card) {
      return ApiErrors.notFound('Card');
    }

    // Calculate duration if not provided
    let calculatedDuration = durationMs;
    if (!calculatedDuration && startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      calculatedDuration = end.getTime() - start.getTime();
    }

    const timeLog = await prisma.timeLog.create({
      data: {
        cardId,
        userId,
        listId,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : new Date(),
        durationMs: calculatedDuration || 0,
        isManual: true,
        notes: notes?.trim() || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        list: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return apiSuccess(timeLog, 201);
  } catch (error) {
    console.error('Failed to create time log:', error);
    return ApiErrors.internal('Failed to create time log');
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
