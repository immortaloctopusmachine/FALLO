import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import type { Prisma } from '@prisma/client';

const CREATE_MANY_CHUNK_SIZE = 500;

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (items.length <= chunkSize) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function asJsonObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function remapCardReference(
  source: Record<string, unknown>,
  key: string,
  cardIdMap: Map<string, string>,
) {
  const value = source[key];
  if (typeof value !== 'string' || value.length === 0) {
    delete source[key];
    return;
  }
  const mapped = cardIdMap.get(value);
  if (mapped) {
    source[key] = mapped;
  } else {
    delete source[key];
  }
}

function remapListReference(
  source: Record<string, unknown>,
  key: string,
  listIdMap: Map<string, string>,
) {
  const value = source[key];
  if (typeof value !== 'string' || value.length === 0) {
    delete source[key];
    return;
  }
  const mapped = listIdMap.get(value);
  if (mapped) {
    source[key] = mapped;
  } else {
    delete source[key];
  }
}

function remapTaskData(
  value: Prisma.JsonValue | null | undefined,
  cardIdMap: Map<string, string>,
  listIdMap: Map<string, string>,
): Prisma.InputJsonValue | undefined {
  const taskData = asJsonObject(value);
  if (!taskData) {
    return value ?? undefined;
  }

  const updated = { ...taskData };
  remapCardReference(updated, 'linkedUserStoryId', cardIdMap);
  remapCardReference(updated, 'linkedEpicId', cardIdMap);
  remapCardReference(updated, 'dependsOnTaskId', cardIdMap);
  remapListReference(updated, 'stagedFromPlanningListId', listIdMap);
  remapListReference(updated, 'releaseTargetListId', listIdMap);

  return updated as Prisma.InputJsonValue;
}

function remapUserStoryData(
  value: Prisma.JsonValue | null | undefined,
  cardIdMap: Map<string, string>,
): Prisma.InputJsonValue | undefined {
  const userStoryData = asJsonObject(value);
  if (!userStoryData) {
    return value ?? undefined;
  }

  const updated = { ...userStoryData };
  remapCardReference(updated, 'linkedEpicId', cardIdMap);
  return updated as Prisma.InputJsonValue;
}

// POST /api/boards/[boardId]/clone - Clone a board (works with regular boards and templates)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    // Fetch only fields needed for cloning to reduce read payload.
    const sourceBoard = await prisma.board.findFirst({
      where: {
        id: boardId,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: {
        name: true,
        description: true,
        settings: true,
        lists: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            name: true,
            position: true,
            viewType: true,
            phase: true,
            color: true,
            durationWeeks: true,
            durationDays: true,
            cards: {
              where: { archivedAt: null },
              orderBy: { position: 'asc' },
              select: {
                id: true,
                type: true,
                title: true,
                description: true,
                position: true,
                color: true,
                featureImage: true,
                featureImagePosition: true,
                taskData: true,
                userStoryData: true,
                epicData: true,
                utilityData: true,
                checklists: {
                  select: {
                    name: true,
                    type: true,
                    position: true,
                    items: {
                      orderBy: { position: 'asc' },
                      select: {
                        content: true,
                        position: true,
                      },
                    },
                  },
                },
                attachments: {
                  select: {
                    name: true,
                    url: true,
                    type: true,
                    size: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!sourceBoard) {
      return ApiErrors.notFound('Board');
    }

    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name : '';
    const asTemplate = body.asTemplate === true;
    const startDate = typeof body.startDate === 'string' ? body.startDate : undefined;
    const teamId = typeof body.teamId === 'string' && body.teamId.length > 0 ? body.teamId : null;
    const memberIds = Array.isArray(body.memberIds) ? body.memberIds : [];
    const initialSettings = body.settings;

    const newBoardName = name.trim() || `${sourceBoard.name} (Copy)`;
    const sourceSettings =
      sourceBoard.settings && typeof sourceBoard.settings === 'object' && !Array.isArray(sourceBoard.settings)
        ? (sourceBoard.settings as Record<string, unknown>)
        : {};
    const mergedSettings = {
      ...sourceSettings,
      ...(initialSettings && typeof initialSettings === 'object' && !Array.isArray(initialSettings)
        ? (initialSettings as Record<string, unknown>)
        : {}),
      ...(startDate ? { projectStartDate: startDate } : {}),
    };

    let membersToAdd: { userId: string; permission: 'MEMBER' | 'ADMIN' }[] = [];
    if (memberIds.length > 0) {
      membersToAdd = memberIds
        .filter((id): id is string => typeof id === 'string' && id !== session.user.id)
        .map((id) => ({ userId: id, permission: 'MEMBER' as const }));
    } else if (teamId) {
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId },
        select: { userId: true, permission: true },
      });
      membersToAdd = teamMembers
        .filter((member) => member.userId !== session.user.id)
        .map((member) => ({
          userId: member.userId,
          permission:
            member.permission === 'ADMIN' || member.permission === 'SUPER_ADMIN'
              ? ('ADMIN' as const)
              : ('MEMBER' as const),
        }));
    }

    if (membersToAdd.length > 1) {
      const uniqueMembers = new Map<string, 'MEMBER' | 'ADMIN'>();
      for (const member of membersToAdd) {
        const existing = uniqueMembers.get(member.userId);
        if (existing === 'ADMIN') continue;
        uniqueMembers.set(member.userId, member.permission === 'ADMIN' ? 'ADMIN' : 'MEMBER');
      }
      membersToAdd = Array.from(uniqueMembers.entries()).map(([userId, permission]) => ({
        userId,
        permission,
      }));
    }

    // Pre-generate all IDs so we can bulk insert and remap links without post-create queries.
    const newBoardId = randomUUID();
    const listIdMap = new Map<string, string>();
    const cardIdMap = new Map<string, string>();

    for (const sourceList of sourceBoard.lists) {
      listIdMap.set(sourceList.id, randomUUID());
      for (const sourceCard of sourceList.cards) {
        cardIdMap.set(sourceCard.id, randomUUID());
      }
    }

    const listRows: Prisma.ListCreateManyInput[] = [];
    const cardRows: Prisma.CardCreateManyInput[] = [];
    const checklistRows: Prisma.ChecklistCreateManyInput[] = [];
    const checklistItemRows: Prisma.ChecklistItemCreateManyInput[] = [];
    const attachmentRows: Prisma.AttachmentCreateManyInput[] = [];

    for (const sourceList of sourceBoard.lists) {
      const mappedListId = listIdMap.get(sourceList.id);
      if (!mappedListId) continue;

      listRows.push({
        id: mappedListId,
        boardId: newBoardId,
        name: sourceList.name,
        position: sourceList.position,
        viewType: sourceList.viewType,
        phase: sourceList.phase,
        color: sourceList.color,
        startDate: null,
        endDate: null,
        durationWeeks: sourceList.durationWeeks,
        durationDays: sourceList.durationDays,
      });

      for (const sourceCard of sourceList.cards) {
        const mappedCardId = cardIdMap.get(sourceCard.id);
        if (!mappedCardId) continue;

        cardRows.push({
          id: mappedCardId,
          listId: mappedListId,
          type: sourceCard.type,
          title: sourceCard.title,
          description: sourceCard.description,
          position: sourceCard.position,
          color: sourceCard.color,
          featureImage: sourceCard.featureImage,
          featureImagePosition: sourceCard.featureImagePosition,
          taskData: remapTaskData(sourceCard.taskData, cardIdMap, listIdMap),
          userStoryData: remapUserStoryData(sourceCard.userStoryData, cardIdMap),
          epicData: sourceCard.epicData as Prisma.InputJsonValue | undefined,
          utilityData: sourceCard.utilityData as Prisma.InputJsonValue | undefined,
        });

        for (const sourceChecklist of sourceCard.checklists) {
          const mappedChecklistId = randomUUID();
          checklistRows.push({
            id: mappedChecklistId,
            cardId: mappedCardId,
            name: sourceChecklist.name,
            type: sourceChecklist.type,
            position: sourceChecklist.position,
          });

          for (const sourceItem of sourceChecklist.items) {
            checklistItemRows.push({
              checklistId: mappedChecklistId,
              content: sourceItem.content,
              position: sourceItem.position,
              isComplete: false,
            });
          }
        }

        for (const sourceAttachment of sourceCard.attachments) {
          attachmentRows.push({
            cardId: mappedCardId,
            name: sourceAttachment.name,
            url: sourceAttachment.url,
            type: sourceAttachment.type,
            size: sourceAttachment.size,
            uploaderId: session.user.id,
          });
        }
      }
    }

    const boardMemberRows: Prisma.BoardMemberCreateManyInput[] = [
      {
        boardId: newBoardId,
        userId: session.user.id,
        permission: 'ADMIN',
      },
      ...membersToAdd.map((member) => ({
        boardId: newBoardId,
        userId: member.userId,
        permission: member.permission,
      })),
    ];

    await prisma.$transaction(async (tx) => {
      await tx.board.create({
        data: {
          id: newBoardId,
          name: newBoardName,
          description: sourceBoard.description,
          isTemplate: asTemplate,
          settings: mergedSettings,
          teamId,
        },
      });

      await tx.boardMember.createMany({
        data: boardMemberRows,
        skipDuplicates: true,
      });

      if (listRows.length > 0) {
        for (const chunk of chunkArray(listRows, CREATE_MANY_CHUNK_SIZE)) {
          await tx.list.createMany({ data: chunk });
        }
      }

      if (cardRows.length > 0) {
        for (const chunk of chunkArray(cardRows, CREATE_MANY_CHUNK_SIZE)) {
          await tx.card.createMany({ data: chunk });
        }
      }

      if (checklistRows.length > 0) {
        for (const chunk of chunkArray(checklistRows, CREATE_MANY_CHUNK_SIZE)) {
          await tx.checklist.createMany({ data: chunk });
        }
      }

      if (checklistItemRows.length > 0) {
        for (const chunk of chunkArray(checklistItemRows, CREATE_MANY_CHUNK_SIZE)) {
          await tx.checklistItem.createMany({ data: chunk });
        }
      }

      if (attachmentRows.length > 0) {
        for (const chunk of chunkArray(attachmentRows, CREATE_MANY_CHUNK_SIZE)) {
          await tx.attachment.createMany({ data: chunk });
        }
      }
    }, { timeout: 60000 });

    return apiSuccess({ id: newBoardId }, 201);
  } catch (error) {
    console.error('Failed to clone board:', error);
    return ApiErrors.internal('Failed to clone board');
  }
}
