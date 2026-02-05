import { prisma } from '@/lib/prisma';
import { getMonday, getFriday } from '@/lib/date-utils';
import { getPhaseFromBlockType } from '@/lib/constants';
import {
  requireAuth,
  requireAdmin,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId]/timeline/blocks - Get all blocks for a board
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

    return apiSuccess(blocks.map((block) => ({
      id: block.id,
      startDate: block.startDate.toISOString(),
      endDate: block.endDate.toISOString(),
      position: block.position,
      blockType: block.blockType,
      list: block.list,
    })));
  } catch (error) {
    console.error('Failed to fetch timeline blocks:', error);
    return ApiErrors.internal('Failed to fetch timeline blocks');
  }
}

// POST /api/boards/[boardId]/timeline/blocks - Create a new timeline block
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    // Check if user is admin
    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const { blockTypeId, startDate, endDate, position, listId, createList } = body;

    // Validate required fields
    if (!blockTypeId || !startDate || !endDate) {
      return ApiErrors.validation('blockTypeId, startDate, and endDate are required');
    }

    // Validate block type exists
    const blockType = await prisma.blockType.findUnique({
      where: { id: blockTypeId },
    });

    if (!blockType) {
      return ApiErrors.notFound('Block type');
    }

    // Calculate position if not provided - count existing blocks of this type
    let blockPosition = position;
    if (blockPosition === undefined) {
      const existingBlocks = await prisma.timelineBlock.count({
        where: {
          boardId,
          blockTypeId,
        },
      });
      blockPosition = existingBlocks + 1;
    }

    // Snap dates to Mon-Fri 5-day block
    const snappedMonday = getMonday(new Date(startDate));
    const snappedFriday = getFriday(snappedMonday);

    // If createList is true, create a corresponding Planning list
    let linkedListId = listId;
    if (createList && !listId) {
      // Get the board's planning lists to find the right position
      const planningLists = await prisma.list.findMany({
        where: {
          boardId,
          viewType: 'PLANNING',
        },
        orderBy: { position: 'desc' },
      });

      const nextPosition = planningLists.length > 0 ? planningLists[0].position + 1 : 0;

      // Map block type to list phase using centralized constants
      const listPhase = getPhaseFromBlockType(blockType.name);

      const newList = await prisma.list.create({
        data: {
          boardId,
          name: `${blockType.name} ${blockPosition}`,
          position: nextPosition,
          viewType: 'PLANNING',
          phase: listPhase,
          color: blockType.color,
          startDate: snappedMonday,
          endDate: snappedFriday,
        },
      });

      linkedListId = newList.id;
    }

    const block = await prisma.timelineBlock.create({
      data: {
        boardId,
        blockTypeId,
        startDate: snappedMonday,
        endDate: snappedFriday,
        position: blockPosition,
        listId: linkedListId || null,
      },
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
    });

    return apiSuccess({
      id: block.id,
      startDate: block.startDate.toISOString(),
      endDate: block.endDate.toISOString(),
      position: block.position,
      blockType: block.blockType,
      list: block.list,
    }, 201);
  } catch (error) {
    console.error('Failed to create timeline block:', error);
    return ApiErrors.internal('Failed to create timeline block');
  }
}
