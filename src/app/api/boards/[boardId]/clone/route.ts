import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// POST /api/boards/[boardId]/clone - Clone a board (works with regular boards and templates)
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

    // Get the source board with all its data
    const sourceBoard = await prisma.board.findFirst({
      where: {
        id: boardId,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              where: { archivedAt: null },
              orderBy: { position: 'asc' },
              include: {
                checklists: {
                  include: {
                    items: {
                      orderBy: { position: 'asc' },
                    },
                  },
                },
                attachments: true,
              },
            },
          },
        },
      },
    });

    if (!sourceBoard) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Board not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, asTemplate = false } = body;

    const newBoardName = name?.trim() || `${sourceBoard.name} (Copy)`;

    // Create ID mapping for cards (old ID -> new ID)
    const cardIdMap = new Map<string, string>();

    // Clone the board using a transaction
    const newBoard = await prisma.$transaction(async (tx) => {
      // 1. Create the new board
      const board = await tx.board.create({
        data: {
          name: newBoardName,
          description: sourceBoard.description,
          isTemplate: asTemplate,
          settings: sourceBoard.settings || {},
          members: {
            create: {
              userId: session.user.id,
              role: 'ADMIN',
            },
          },
        },
      });

      // 2. Clone lists and cards
      for (const sourceList of sourceBoard.lists) {
        const newList = await tx.list.create({
          data: {
            boardId: board.id,
            name: sourceList.name,
            position: sourceList.position,
            viewType: sourceList.viewType,
            phase: sourceList.phase,
            color: sourceList.color,
            // Don't copy dates for templates/clones - user will set their own
            startDate: null,
            endDate: null,
            durationWeeks: sourceList.durationWeeks,
          },
        });

        // Clone cards in this list
        for (const sourceCard of sourceList.cards) {
          const newCard = await tx.card.create({
            data: {
              listId: newList.id,
              type: sourceCard.type,
              title: sourceCard.title,
              description: sourceCard.description,
              position: sourceCard.position,
              color: sourceCard.color,
              featureImage: sourceCard.featureImage,
              featureImagePosition: sourceCard.featureImagePosition,
              // Copy type-specific data (will update linked IDs later)
              taskData: sourceCard.taskData ?? undefined,
              userStoryData: sourceCard.userStoryData ?? undefined,
              epicData: sourceCard.epicData ?? undefined,
              utilityData: sourceCard.utilityData ?? undefined,
              // Don't copy: assignees, comments (they're user-specific)
            },
          });

          // Store ID mapping
          cardIdMap.set(sourceCard.id, newCard.id);

          // Clone checklists
          for (const sourceChecklist of sourceCard.checklists) {
            const newChecklist = await tx.checklist.create({
              data: {
                cardId: newCard.id,
                name: sourceChecklist.name,
                type: sourceChecklist.type,
                position: sourceChecklist.position,
              },
            });

            // Clone checklist items (reset completion status for templates)
            for (const sourceItem of sourceChecklist.items) {
              await tx.checklistItem.create({
                data: {
                  checklistId: newChecklist.id,
                  content: sourceItem.content,
                  position: sourceItem.position,
                  isComplete: false, // Reset completion status
                },
              });
            }
          }

          // Clone attachments (just references, not actual files)
          for (const sourceAttachment of sourceCard.attachments) {
            await tx.attachment.create({
              data: {
                cardId: newCard.id,
                name: sourceAttachment.name,
                url: sourceAttachment.url,
                type: sourceAttachment.type,
                size: sourceAttachment.size,
                uploaderId: session.user.id,
              },
            });
          }
        }
      }

      return board;
    });

    // 3. Update card connections with new IDs
    // This needs to be done after all cards are created
    type CardUpdate = {
      id: string;
      taskData?: Prisma.InputJsonValue;
      userStoryData?: Prisma.InputJsonValue;
    };
    const cardsToUpdate: CardUpdate[] = [];

    // Get all cards from the new board
    const newBoardCards = await prisma.card.findMany({
      where: {
        list: {
          boardId: newBoard.id,
        },
      },
      select: {
        id: true,
        type: true,
        taskData: true,
        userStoryData: true,
      },
    });

    for (const card of newBoardCards) {
      if (card.type === 'TASK' && card.taskData) {
        const taskData = card.taskData as { linkedUserStoryId?: string; linkedEpicId?: string };
        let needsUpdate = false;
        const updatedTaskData = { ...taskData };

        if (taskData.linkedUserStoryId && cardIdMap.has(taskData.linkedUserStoryId)) {
          updatedTaskData.linkedUserStoryId = cardIdMap.get(taskData.linkedUserStoryId);
          needsUpdate = true;
        } else if (taskData.linkedUserStoryId) {
          // The linked card doesn't exist in this clone, remove the link
          delete updatedTaskData.linkedUserStoryId;
          needsUpdate = true;
        }

        if (taskData.linkedEpicId && cardIdMap.has(taskData.linkedEpicId)) {
          updatedTaskData.linkedEpicId = cardIdMap.get(taskData.linkedEpicId);
          needsUpdate = true;
        } else if (taskData.linkedEpicId) {
          delete updatedTaskData.linkedEpicId;
          needsUpdate = true;
        }

        if (needsUpdate) {
          cardsToUpdate.push({ id: card.id, taskData: updatedTaskData as Prisma.InputJsonValue });
        }
      }

      if (card.type === 'USER_STORY' && card.userStoryData) {
        const userStoryData = card.userStoryData as { linkedEpicId?: string };

        if (userStoryData.linkedEpicId) {
          const updatedUserStoryData = { ...userStoryData };

          if (cardIdMap.has(userStoryData.linkedEpicId)) {
            updatedUserStoryData.linkedEpicId = cardIdMap.get(userStoryData.linkedEpicId);
          } else {
            delete updatedUserStoryData.linkedEpicId;
          }

          cardsToUpdate.push({ id: card.id, userStoryData: updatedUserStoryData as Prisma.InputJsonValue });
        }
      }
    }

    // Batch update cards with new connection IDs
    for (const cardUpdate of cardsToUpdate) {
      if (cardUpdate.taskData) {
        await prisma.card.update({
          where: { id: cardUpdate.id },
          data: { taskData: cardUpdate.taskData },
        });
      }
      if (cardUpdate.userStoryData) {
        await prisma.card.update({
          where: { id: cardUpdate.id },
          data: { userStoryData: cardUpdate.userStoryData },
        });
      }
    }

    // Fetch the complete new board for response
    const completeBoard = await prisma.board.findUnique({
      where: { id: newBoard.id },
      include: {
        members: {
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
        },
        lists: {
          orderBy: { position: 'asc' },
          include: {
            _count: {
              select: { cards: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: completeBoard }, { status: 201 });
  } catch (error) {
    console.error('Failed to clone board:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to clone board' } },
      { status: 500 }
    );
  }
}
