import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/boards/[boardId]/cards/reorder - Reorder cards (for drag-drop)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth();
    const { boardId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check membership
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this board' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { cardId, sourceListId, destinationListId, newPosition } = body;

    if (!cardId || !sourceListId || !destinationListId || newPosition === undefined) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    // Verify lists belong to board
    const lists = await prisma.list.findMany({
      where: {
        id: { in: [sourceListId, destinationListId] },
        boardId,
      },
    });

    if (lists.length !== (sourceListId === destinationListId ? 1 : 2)) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Lists not found' } },
        { status: 404 }
      );
    }

    // Use a transaction to update positions
    await prisma.$transaction(async (tx) => {
      // If moving to a different list
      if (sourceListId !== destinationListId) {
        // Shift cards down in destination list
        await tx.card.updateMany({
          where: {
            listId: destinationListId,
            position: { gte: newPosition },
          },
          data: {
            position: { increment: 1 },
          },
        });

        // Move the card
        await tx.card.update({
          where: { id: cardId },
          data: {
            listId: destinationListId,
            position: newPosition,
          },
        });

        // Clean up positions in source list
        const sourceCards = await tx.card.findMany({
          where: { listId: sourceListId },
          orderBy: { position: 'asc' },
        });

        for (let i = 0; i < sourceCards.length; i++) {
          if (sourceCards[i].position !== i) {
            await tx.card.update({
              where: { id: sourceCards[i].id },
              data: { position: i },
            });
          }
        }
      } else {
        // Moving within the same list
        const card = await tx.card.findUnique({ where: { id: cardId } });
        if (!card) throw new Error('Card not found');

        const oldPosition = card.position;

        if (oldPosition < newPosition) {
          // Moving down: shift cards up
          await tx.card.updateMany({
            where: {
              listId: sourceListId,
              position: { gt: oldPosition, lte: newPosition },
            },
            data: {
              position: { decrement: 1 },
            },
          });
        } else if (oldPosition > newPosition) {
          // Moving up: shift cards down
          await tx.card.updateMany({
            where: {
              listId: sourceListId,
              position: { gte: newPosition, lt: oldPosition },
            },
            data: {
              position: { increment: 1 },
            },
          });
        }

        await tx.card.update({
          where: { id: cardId },
          data: { position: newPosition },
        });
      }
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to reorder cards:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder cards' } },
      { status: 500 }
    );
  }
}
