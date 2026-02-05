import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId]/timeline - Get all timeline data for a board
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    // Get board with team info
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        name: true,
        team: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    // Get timeline blocks
    const blocks = await prisma.timelineBlock.findMany({
      where: { boardId },
      include: {
        blockType: true,
        list: {
          select: {
            id: true,
            name: true,
            phase: true,
          },
        },
      },
      orderBy: [{ startDate: 'asc' }, { position: 'asc' }],
    });

    // Get weekly availability
    const availability = await prisma.userWeeklyAvailability.findMany({
      where: { boardId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { weekStart: 'asc' },
    });

    // Get timeline events
    const events = await prisma.timelineEvent.findMany({
      where: { boardId },
      include: {
        eventType: true,
      },
      orderBy: { startDate: 'asc' },
    });

    // Get available block types
    const blockTypes = await prisma.blockType.findMany({
      where: {
        OR: [
          { studioId: null }, // Global
          { studio: { teams: { some: { boards: { some: { id: boardId } } } } } }, // Studio-specific
        ],
      },
      orderBy: { position: 'asc' },
    });

    // Get available event types
    const eventTypes = await prisma.eventType.findMany({
      where: {
        OR: [
          { studioId: null }, // Global
          { studio: { teams: { some: { boards: { some: { id: boardId } } } } } }, // Studio-specific
        ],
      },
      orderBy: { position: 'asc' },
    });

    return apiSuccess({
      board,
      blocks: blocks.map((block) => ({
        id: block.id,
        startDate: block.startDate.toISOString(),
        endDate: block.endDate.toISOString(),
        position: block.position,
        blockType: block.blockType,
        list: block.list,
      })),
      events,
      availability: availability.map((a) => ({
        id: a.id,
        dedication: a.dedication,
        weekStart: a.weekStart.toISOString(),
        userId: a.userId,
        boardId: a.boardId,
        user: a.user,
      })),
      blockTypes,
      eventTypes,
    });
  } catch (error) {
    console.error('Failed to fetch timeline:', error);
    return ApiErrors.internal('Failed to fetch timeline');
  }
}
