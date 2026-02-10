import { prisma } from '@/lib/prisma';
import { BOARD_TEMPLATES, calculateListDates } from '@/lib/list-templates';
import { addBusinessDays, snapToMonday } from '@/lib/date-utils';
import {
  requireAuth,
  requireBoardAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import { PHASE_SEARCH_TERMS } from '@/lib/constants';
import { renumberTimelineBlockPositions } from '@/lib/timeline-block-position';
import type { BoardTemplateType, ListPhase } from '@/types';

async function findBlockTypeForList(list: {
  name: string;
  phase: string | null;
  color: string | null;
}) {
  const searchTerms = list.phase ? PHASE_SEARCH_TERMS[list.phase as ListPhase] : null;
  const listNameLower = list.name.toLowerCase();

  let blockType = null;

  if (searchTerms) {
    for (const term of searchTerms) {
      blockType = await prisma.blockType.findFirst({
        where: { name: { contains: term, mode: 'insensitive' } },
      });
      if (blockType) break;
    }
  }

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

  if (!blockType) {
    blockType = await prisma.blockType.findFirst({
      where: { isDefault: true },
    });
  }

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

  return blockType;
}

// POST /api/boards/[boardId]/apply-dates - Apply dates to planning lists based on project start date
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

    // Get board with settings and planning lists
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        lists: {
          where: { viewType: 'PLANNING' },
          orderBy: { position: 'asc' },
        },
        timelineBlocks: {
          where: { listId: { not: null } },
        },
        timelineEvents: {
          include: { eventType: true },
          orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!board) {
      return ApiErrors.notFound('Board');
    }

    const settings = (board.settings as Record<string, unknown>) || {};
    const projectStartDate = settings.projectStartDate as string | undefined;
    const coreProjectTemplateId = settings.coreProjectTemplateId as string | undefined;
    const listTemplate = (settings.listTemplate as BoardTemplateType) || 'STANDARD_SLOT';

    if (!projectStartDate) {
      return ApiErrors.validation('Project start date not set in board settings');
    }

    const coreTemplate = coreProjectTemplateId
      ? await prisma.coreProjectTemplate.findFirst({
          where: {
            id: coreProjectTemplateId,
            archivedAt: null,
          },
          include: {
            blocks: {
              include: { blockType: true },
              orderBy: { position: 'asc' },
            },
            events: {
              include: { eventType: true },
              orderBy: [{ unitOffset: 'asc' }, { position: 'asc' }],
            },
          },
        })
      : null;

    if (coreProjectTemplateId && !coreTemplate) {
      return ApiErrors.validation('Configured core project template was not found');
    }

    let listDates: { listName: string; startDate: Date; endDate: Date; durationDays?: number }[] = [];
    if (coreTemplate) {
      let cursor = snapToMonday(new Date(projectStartDate));
      const counters = new Map<string, number>();
      listDates = coreTemplate.blocks.map((blockRow) => {
        const next = (counters.get(blockRow.blockTypeId) ?? 0) + 1;
        counters.set(blockRow.blockTypeId, next);
        const start = new Date(cursor);
        const end = addBusinessDays(start, 4);
        cursor = addBusinessDays(end, 1);
        return {
          listName: `${blockRow.blockType.name} ${next}`,
          startDate: start,
          endDate: end,
          durationDays: 5,
        };
      });
    } else {
      const template = BOARD_TEMPLATES[listTemplate];
      if (!template) {
        return ApiErrors.validation('Invalid list template');
      }
      listDates = calculateListDates(template, new Date(projectStartDate));
    }

    // Update each planning list with calculated dates
    const updatedLists = [];
    for (let i = 0; i < board.lists.length; i++) {
      const list = board.lists[i];
      const dateEntry = coreTemplate
        ? listDates[i]
        : listDates.find((d) => d.listName.toLowerCase() === list.name.toLowerCase()) ?? listDates[i];

      if (dateEntry) {
        await prisma.list.update({
          where: { id: list.id },
          data: {
            startDate: dateEntry.startDate,
            endDate: dateEntry.endDate,
            durationDays: dateEntry.durationDays,
          },
        });
        updatedLists.push({ id: list.id, name: list.name, ...dateEntry });
      }
    }

    // Also update the board's lastDayAnimationTweaks setting based on the last list's end date
    if (updatedLists.length > 0) {
      const lastList = updatedLists[updatedLists.length - 1];
      await prisma.board.update({
        where: { id: boardId },
        data: {
          settings: {
            ...settings,
            lastDayAnimationTweaks: lastList.endDate.toISOString(),
          },
        },
      });
    }

    const freshLists = await prisma.list.findMany({
      where: {
        boardId,
        viewType: 'PLANNING',
        startDate: { not: null },
        endDate: { not: null },
      },
      orderBy: { position: 'asc' },
    });

    const timelineBlocksByListId = new Map(
      board.timelineBlocks
        .filter((block) => block.listId)
        .map((block) => [block.listId as string, block])
    );

    const upsertedBlocks = [];
    for (let i = 0; i < freshLists.length; i++) {
      const list = freshLists[i];
      const explicitBlockTypeId = coreTemplate?.blocks[i]?.blockTypeId;
      const explicitBlockType = explicitBlockTypeId
        ? await prisma.blockType.findUnique({ where: { id: explicitBlockTypeId } })
        : null;
      const fallbackBlockType = explicitBlockType ?? await findBlockTypeForList(list);
      const existingBlock = timelineBlocksByListId.get(list.id);

      if (existingBlock) {
        const updated = await prisma.timelineBlock.update({
          where: { id: existingBlock.id },
          data: {
            blockTypeId: fallbackBlockType.id,
            startDate: list.startDate!,
            endDate: list.endDate!,
            position: i + 1,
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
        upsertedBlocks.push({
          id: updated.id,
          listName: list.name,
          blockTypeName: updated.blockType.name,
        });
      } else {
        const created = await prisma.timelineBlock.create({
          data: {
            boardId,
            blockTypeId: fallbackBlockType.id,
            listId: list.id,
            startDate: list.startDate!,
            endDate: list.endDate!,
            position: i + 1,
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
        upsertedBlocks.push({
          id: created.id,
          listName: list.name,
          blockTypeName: created.blockType.name,
        });
      }
    }

    await renumberTimelineBlockPositions(boardId);

    if (coreTemplate) {
      const firstDate = snapToMonday(new Date(projectStartDate));
      const useLegacyIndexOffset = coreTemplate.events.every((event) => (event as { unitOffset?: number }).unitOffset === 0);

      const existingEvents = board.timelineEvents;
      const targetCount = coreTemplate.events.length;

      for (let i = 0; i < targetCount; i++) {
        const templateEvent = coreTemplate.events[i];
        const explicitUnitOffset = Math.max(
          0,
          Math.floor((templateEvent as { unitOffset?: number }).unitOffset ?? 0)
        );
        const unitOffset = useLegacyIndexOffset ? i * 5 : explicitUnitOffset;
        const eventDate = addBusinessDays(firstDate, unitOffset);
        const title = templateEvent.title?.trim() || templateEvent.eventType.name;

        if (existingEvents[i]) {
          await prisma.timelineEvent.update({
            where: { id: existingEvents[i].id },
            data: {
              eventTypeId: templateEvent.eventTypeId,
              title,
              startDate: eventDate,
              endDate: eventDate,
            },
          });
        } else {
          await prisma.timelineEvent.create({
            data: {
              boardId,
              eventTypeId: templateEvent.eventTypeId,
              title,
              startDate: eventDate,
              endDate: eventDate,
            },
          });
        }
      }

      if (existingEvents.length > targetCount) {
        await prisma.timelineEvent.deleteMany({
          where: { id: { in: existingEvents.slice(targetCount).map((event) => event.id) } },
        });
      }
    }

    return apiSuccess({
      message: `Applied dates to ${updatedLists.length} lists and synced ${upsertedBlocks.length} timeline blocks`,
      listsUpdated: updatedLists.length,
      blocksCreated: upsertedBlocks.length,
      lists: updatedLists,
      blocks: upsertedBlocks,
    });
  } catch (error) {
    console.error('Failed to apply dates:', error);
    return ApiErrors.internal('Failed to apply dates');
  }
}
