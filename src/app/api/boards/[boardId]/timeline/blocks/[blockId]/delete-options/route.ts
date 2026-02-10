import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId]/timeline/blocks/[blockId]/delete-options
// Returns card-move requirements/options before deleting a block.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string; blockId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, blockId } = await params;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const block = await prisma.timelineBlock.findFirst({
      where: { id: blockId, boardId },
      include: {
        list: {
          select: {
            id: true,
            name: true,
            position: true,
            viewType: true,
          },
        },
      },
    });

    if (!block) {
      return ApiErrors.notFound('Block');
    }

    if (!block.listId || !block.list) {
      return apiSuccess({
        blockId: block.id,
        linkedList: null,
        cardCount: 0,
        availableLists: [],
        recommendedListId: null,
        requiresCardDeletion: false,
      });
    }

    const cardCount = await prisma.card.count({
      where: {
        listId: block.listId,
        archivedAt: null,
      },
    });

    const planningLists = await prisma.list.findMany({
      where: {
        boardId,
        viewType: 'PLANNING',
      },
      select: {
        id: true,
        name: true,
        position: true,
      },
      orderBy: { position: 'asc' },
    });

    const linkedIndex = planningLists.findIndex((list) => list.id === block.listId);
    const availableLists = planningLists.filter((list) => list.id !== block.listId);

    let recommendedListId: string | null = null;
    if (linkedIndex >= 0) {
      const next = planningLists[linkedIndex + 1];
      const prev = planningLists[linkedIndex - 1];
      recommendedListId = next?.id ?? prev?.id ?? null;
    }

    const requiresCardDeletion = cardCount > 0 && availableLists.length === 0;

    return apiSuccess({
      blockId: block.id,
      linkedList: {
        id: block.list.id,
        name: block.list.name,
      },
      cardCount,
      availableLists,
      recommendedListId,
      requiresCardDeletion,
    });
  } catch (error) {
    console.error('Failed to load block delete options:', error);
    return ApiErrors.internal('Failed to load block delete options');
  }
}

