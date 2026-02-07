import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import { PHASE_SEARCH_TERMS } from '@/lib/constants';

// POST /api/boards/[boardId]/sync-timeline - Create timeline blocks for existing planning lists
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    const { response: adminResponse } = await requireBoardAdmin(boardId, session.user.id);
    if (adminResponse) return adminResponse;

    // Get all planning lists without timeline blocks
    const planningLists = await prisma.list.findMany({
      where: {
        boardId,
        viewType: 'PLANNING',
        startDate: { not: null },
        endDate: { not: null },
        timelineBlock: null, // No existing timeline block
      },
      orderBy: { position: 'asc' },
    });

    if (planningLists.length === 0) {
      return apiSuccess({ message: 'No planning lists need timeline blocks', created: 0 });
    }

    // Get the highest position for timeline blocks in this board
    const lastBlock = await prisma.timelineBlock.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
    });

    let currentPosition = (lastBlock?.position ?? -1) + 1;
    const createdBlocks = [];

    for (const list of planningLists) {
      // Find matching block type based on phase or list name
      const searchTerms = list.phase ? PHASE_SEARCH_TERMS[list.phase as keyof typeof PHASE_SEARCH_TERMS] : null;
      const listNameLower = list.name.toLowerCase();

      let blockType = null;

      // First try to find by phase-specific search terms
      if (searchTerms) {
        for (const term of searchTerms) {
          blockType = await prisma.blockType.findFirst({
            where: { name: { contains: term, mode: 'insensitive' } },
          });
          if (blockType) break;
        }
      }

      // If not found, try to match by list name
      if (!blockType) {
        const nameParts = listNameLower.split(/[\s\/\-]+/);
        for (const part of nameParts) {
          if (part.length > 2) {
            blockType = await prisma.blockType.findFirst({
              where: { name: { contains: part, mode: 'insensitive' } },
            });
            if (blockType) break;
          }
        }
      }

      // If still not found, use any default block type
      if (!blockType) {
        blockType = await prisma.blockType.findFirst({
          where: { isDefault: true },
        });
      }

      // If still not found, create a new block type
      if (!blockType) {
        blockType = await prisma.blockType.create({
          data: {
            name: list.name,
            color: list.color || '#6B7280',
            isDefault: false,
            position: 0,
          },
        });
      }

      // Create the timeline block
      const timelineBlock = await prisma.timelineBlock.create({
        data: {
          boardId,
          blockTypeId: blockType.id,
          listId: list.id,
          startDate: list.startDate!,
          endDate: list.endDate!,
          position: currentPosition++,
        },
        include: {
          blockType: {
            select: { name: true, color: true },
          },
          list: {
            select: { name: true },
          },
        },
      });

      createdBlocks.push({
        id: timelineBlock.id,
        listName: list.name,
        blockTypeName: timelineBlock.blockType.name,
      });
    }

    // Update board's end date to the latest planning list end date
    const latestList = await prisma.list.findFirst({
      where: {
        boardId,
        viewType: 'PLANNING',
        endDate: { not: null },
      },
      orderBy: { endDate: 'desc' },
    });

    if (latestList?.endDate) {
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        select: { settings: true },
      });

      const currentSettings = (board?.settings as Record<string, unknown>) || {};

      await prisma.board.update({
        where: { id: boardId },
        data: {
          settings: {
            ...currentSettings,
            lastDayAnimationTweaks: latestList.endDate.toISOString(),
          },
        },
      });
    }

    return apiSuccess({
      message: `Created ${createdBlocks.length} timeline blocks`,
      created: createdBlocks.length,
      blocks: createdBlocks,
    });
  } catch (error) {
    console.error('Failed to sync timeline blocks:', error);
    return ApiErrors.internal('Failed to sync timeline blocks');
  }
}
