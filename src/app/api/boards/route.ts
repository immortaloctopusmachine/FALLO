import { prisma } from '@/lib/prisma';
import { BOARD_TEMPLATES, calculateListDates } from '@/lib/list-templates';
import { addBusinessDays, snapToMonday } from '@/lib/date-utils';
import { parseBoardArchivedOnlyAt, parseProjectArchivedAt } from '@/lib/project-archive';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { PHASE_SEARCH_TERMS } from '@/lib/constants';
import { getPhaseFromBlockType } from '@/lib/constants';
import type { BoardTemplateType, ListViewType, ListPhase, BoardSettings } from '@/types';

const CORE_TEMPLATE_TASK_LISTS = BOARD_TEMPLATES.STANDARD_SLOT.taskLists;

import type { BlockType as PrismaBlockType } from '@prisma/client';
type BlockType = PrismaBlockType;

function matchBlockTypeForList(
  allBlockTypes: BlockType[],
  list: { name: string; phase: string | null },
): BlockType | null {
  const searchTerms = list.phase ? PHASE_SEARCH_TERMS[list.phase as keyof typeof PHASE_SEARCH_TERMS] : null;

  if (searchTerms) {
    for (const term of searchTerms) {
      const match = allBlockTypes.find(bt => bt.name.toLowerCase().includes(term.toLowerCase()));
      if (match) return match;
    }
  }

  const nameParts = list.name.toLowerCase().split(/[\s\/\-]+/);
  for (const part of nameParts) {
    if (part.length > 2) {
      const match = allBlockTypes.find(bt => bt.name.toLowerCase().includes(part));
      if (match) return match;
    }
  }

  return allBlockTypes.find(bt => bt.isDefault) ?? null;
}

// GET /api/boards - Get all boards for current user
// Note: "projects" are non-template boards (same DB model, different UI view — see CLAUDE.md)
// Query params:
//   ?archived=true                - return archived boards
//   ?projects=true                - return active projects (non-template, non-archived boards)
//   ?projects=true&archived=true  - return archived projects
export async function GET(request: Request) {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const archived = searchParams.get('archived') === 'true';
    const projects = searchParams.get('projects') === 'true';
    const templates = searchParams.get('templates') === 'true';

    if (templates) {
      const templateBoards = await prisma.board.findMany({
        where: {
          isTemplate: true,
          archivedAt: null,
        },
        select: {
          id: true,
          name: true,
          description: true,
          isTemplate: true,
          settings: true,
          lists: {
            orderBy: { position: 'asc' },
            select: { id: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return apiSuccess(templateBoards);
    }

    if (projects) {
      // Projects are filtered by settings.projectArchivedAt (project-level archive state),
      // independent from board archivedAt (board-level archive state).
      const boards = await prisma.board.findMany({
        where: {
          isTemplate: false,
        },
        select: {
          id: true,
          name: true,
          description: true,
          archivedAt: true,
          settings: true,
          team: {
            select: { id: true, name: true, color: true },
          },
          members: {
            select: {
              id: true,
              userId: true,
              permission: true,
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
          weeklyProgress: {
            orderBy: { weekStartDate: 'desc' },
            take: 6,
            select: {
              id: true,
              weekStartDate: true,
              totalStoryPoints: true,
              completedPoints: true,
              tasksCompleted: true,
              tasksTotal: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      const activeBoards: typeof boards = [];
      let archivedCount = 0;

      for (const board of boards) {
        const isBoardArchivedOnly = Boolean(parseBoardArchivedOnlyAt(board.settings));
        const isProjectArchived = Boolean(parseProjectArchivedAt(board.settings))
          || (Boolean(board.archivedAt) && !isBoardArchivedOnly);
        if (isProjectArchived) {
          if (archived) activeBoards.push(board);
          archivedCount++;
        } else {
          if (!archived) activeBoards.push(board);
        }
      }

      if (archived) {
        return apiSuccess(activeBoards);
      }

      return apiSuccess({ projects: activeBoards, archivedCount });
    }

    if (archived) {
      // All authenticated users can see all archived boards
      const boards = await prisma.board.findMany({
        where: {
          archivedAt: { not: null },
        },
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
        orderBy: { archivedAt: 'desc' },
      });

      return apiSuccess(boards);
    }

    // Default: all active boards for any authenticated user
    const boards = await prisma.board.findMany({
      where: {
        archivedAt: null,
      },
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
      orderBy: { updatedAt: 'desc' },
    });

    return apiSuccess(boards);
  } catch (error) {
    console.error('Failed to fetch boards:', error);
    return ApiErrors.internal('Failed to fetch boards');
  }
}

// POST /api/boards - Create a new board
export async function POST(request: Request) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const minimalResponse = searchParams.get('response') === 'minimal';

    const body = await request.json();
    const {
      name,
      description,
      template = 'BLANK',
      coreTemplateId,
      teamId,
      startDate,
      memberIds,
      settings: initialSettings,
    } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrors.validation('Board name is required');
    }

    const templateType = template as BoardTemplateType;
    const templateConfig = BOARD_TEMPLATES[templateType] || BOARD_TEMPLATES.BLANK;

    const coreTemplate = coreTemplateId
      ? await prisma.coreProjectTemplate.findFirst({
          where: {
            id: coreTemplateId as string,
            archivedAt: null,
          },
          include: {
            blocks: {
              include: { blockType: true },
              orderBy: { position: 'asc' },
            },
            events: {
              include: { eventType: true },
              orderBy: { position: 'asc' },
            },
          },
        })
      : null;

    if (coreTemplateId && !coreTemplate) {
      return ApiErrors.validation('Invalid core template');
    }

    // Build planning sequence either from dynamic core template or legacy hardcoded template.
    const planningRows: {
      name: string;
      viewType: ListViewType;
      phase?: ListPhase | null;
      color?: string | null;
      durationWeeks?: number | null;
      durationDays?: number | null;
      startDate?: Date | null;
      endDate?: Date | null;
    }[] = [];

    if (coreTemplate) {
      const counters = new Map<string, number>();
      const hasDates = Boolean(startDate);
      let cursor = hasDates ? snapToMonday(new Date(startDate as string)) : null;

      for (const blockRow of coreTemplate.blocks) {
        const next = (counters.get(blockRow.blockTypeId) ?? 0) + 1;
        counters.set(blockRow.blockTypeId, next);

        const phase = getPhaseFromBlockType(blockRow.blockType.name);
        const blockStart = cursor ? new Date(cursor) : null;
        const blockEnd = cursor ? addBusinessDays(blockStart!, 4) : null;

        planningRows.push({
          name: `${blockRow.blockType.name} ${next}`,
          viewType: 'PLANNING',
          phase,
          color: blockRow.blockType.color,
          durationWeeks: 0,
          durationDays: 5,
          startDate: blockStart,
          endDate: blockEnd,
        });

        if (cursor) {
          cursor = addBusinessDays(blockEnd!, 1);
        }
      }
    } else if (startDate && templateType !== 'BLANK') {
      const listDates = calculateListDates(templateConfig, new Date(startDate));
      for (const list of templateConfig.planningLists) {
        const dateEntry = listDates.find((d) => d.listName.toLowerCase() === list.name.toLowerCase());
        planningRows.push({
          name: list.name,
          viewType: list.viewType as ListViewType,
          phase: list.phase as ListPhase | undefined,
          color: list.color,
          durationWeeks: list.durationWeeks,
          durationDays: dateEntry?.durationDays,
          startDate: dateEntry?.startDate,
          endDate: dateEntry?.endDate,
        });
      }
    } else {
      for (const list of templateConfig.planningLists) {
        planningRows.push({
          name: list.name,
          viewType: list.viewType as ListViewType,
          phase: list.phase as ListPhase | undefined,
          color: list.color,
          durationWeeks: list.durationWeeks,
        });
      }
    }

    const taskRows = coreTemplate ? CORE_TEMPLATE_TASK_LISTS : templateConfig.taskLists;

    const listsToCreate = [
      ...taskRows.map((list) => ({
        name: list.name,
        position: list.position,
        viewType: list.viewType as ListViewType,
        phase: list.phase as ListPhase | undefined,
        color: list.color,
        durationWeeks: list.durationWeeks,
      })),
      ...planningRows.map((list, idx) => {
        return {
          name: list.name,
          position: taskRows.length + idx,
          viewType: list.viewType as ListViewType,
          phase: list.phase as ListPhase | undefined,
          color: list.color,
          durationWeeks: list.durationWeeks,
          durationDays: list.durationDays ?? undefined,
          startDate: list.startDate ?? undefined,
          endDate: list.endDate ?? undefined,
        };
      }),
    ];

    // Store which template was used in settings (for non-BLANK templates)
    // Using Partial<BoardSettings> to allow incremental building, cast for Prisma JSON field
    // Merge any initial settings from create dialog (e.g. productionTitle, projectRoleAssignments)
    const settings: Partial<BoardSettings> = {
      ...(initialSettings && typeof initialSettings === 'object' ? initialSettings : {}),
    };
    if (coreTemplate) {
      settings.coreProjectTemplateId = coreTemplate.id;
    } else if (templateType !== 'BLANK') {
      settings.listTemplate = templateType as BoardSettings['listTemplate'];
    }

    // Store project start date in settings
    if (startDate) {
      settings.projectStartDate = startDate;
    }

    // Determine which members to add to the board
    let membersToAdd: { userId: string; permission: 'MEMBER' | 'ADMIN' }[] = [];
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      // Use explicit member list (from create project dialog)
      membersToAdd = memberIds
        .filter((id: string) => id !== session.user.id)
        .map((id: string) => ({
          userId: id,
          permission: 'MEMBER' as const,
        }));
    } else if (teamId) {
      // Fallback: auto-add all team members
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId },
        select: { userId: true, permission: true },
      });
      membersToAdd = teamMembers
        .filter((m) => m.userId !== session.user.id)
        .map((m) => ({
          userId: m.userId,
          permission: m.permission === 'ADMIN' || m.permission === 'SUPER_ADMIN' ? 'ADMIN' as const : 'MEMBER' as const,
        }));
    }

    const board = minimalResponse
      ? await prisma.board.create({
          data: {
            name: name.trim(),
            description: description?.trim() || null,
            settings: settings as object,
            teamId: teamId || null,
            members: {
              create: [
                {
                  userId: session.user.id,
                  permission: 'ADMIN',
                },
                ...membersToAdd,
              ],
            },
            lists: {
              create: listsToCreate,
            },
          },
          select: {
            id: true,
          },
        })
      : await prisma.board.create({
          data: {
            name: name.trim(),
            description: description?.trim() || null,
            settings: settings as object,
            teamId: teamId || null,
            members: {
              create: [
                {
                  userId: session.user.id,
                  permission: 'ADMIN',
                },
                ...membersToAdd,
              ],
            },
            lists: {
              create: listsToCreate,
            },
          },
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
            },
          },
        });

    // If start date is provided and we have planning lists with dates, create timeline blocks
    if (startDate && (coreTemplate || templateType !== 'BLANK')) {
      const planningLists = await prisma.list.findMany({
        where: {
          boardId: board.id,
          viewType: 'PLANNING',
          startDate: { not: null },
          endDate: { not: null },
        },
        orderBy: { position: 'asc' },
      });

      // Pre-fetch all block types once (instead of N+1 queries per list)
      const allBlockTypes = await prisma.blockType.findMany();

      // Resolve block type for each planning list (in-memory matching)
      const resolvedBlockTypes: BlockType[] = [];
      for (let i = 0; i < planningLists.length; i++) {
        const list = planningLists[i];
        const explicitBlockTypeId = coreTemplate?.blocks[i]?.blockTypeId;
        let blockType: BlockType | null = null;

        if (explicitBlockTypeId) {
          blockType = allBlockTypes.find(bt => bt.id === explicitBlockTypeId) ?? null;
        }
        if (!blockType) {
          blockType = matchBlockTypeForList(allBlockTypes, list);
        }
        if (!blockType) {
          // Create a new block type only if no match found at all
          blockType = await prisma.blockType.create({
            data: { name: list.name, color: list.color || '#6B7280', isDefault: false, position: 0 },
          });
          allBlockTypes.push(blockType);
        }
        resolvedBlockTypes.push(blockType);
      }

      if (planningLists.length > 0) {
        await prisma.timelineBlock.createMany({
          data: planningLists.map((list, i) => ({
            boardId: board.id,
            blockTypeId: resolvedBlockTypes[i].id,
            listId: list.id,
            startDate: list.startDate!,
            endDate: list.endDate!,
            position: i + 1,
          })),
        });
      }

      if (coreTemplate && coreTemplate.events.length > 0) {
        const firstDate = snapToMonday(new Date(startDate as string));
        const useLegacyIndexOffset = coreTemplate.events.every((event) => (event as { unitOffset?: number }).unitOffset === 0);

        await prisma.timelineEvent.createMany({
          data: coreTemplate.events.map((templateEvent, i) => {
            const explicitUnitOffset = Math.max(
              0,
              Math.floor((templateEvent as { unitOffset?: number }).unitOffset ?? 0)
            );
            const unitOffset = useLegacyIndexOffset ? i * 5 : explicitUnitOffset;
            const eventDate = addBusinessDays(firstDate, unitOffset);

            return {
              boardId: board.id,
              eventTypeId: templateEvent.eventTypeId,
              title: templateEvent.title?.trim() || templateEvent.eventType.name,
              startDate: eventDate,
              endDate: eventDate,
            };
          }),
        });
      }

      // Update board settings with lastDayAnimationTweaks
      if (planningLists.length > 0) {
        const lastList = planningLists[planningLists.length - 1];
        await prisma.board.update({
          where: { id: board.id },
          data: {
            settings: {
              ...settings,
              lastDayAnimationTweaks: lastList.endDate?.toISOString(),
            },
          },
        });
      }
    }

    return apiSuccess(minimalResponse ? { id: board.id } : board, 201);
  } catch (error) {
    console.error('Failed to create board:', error);
    return ApiErrors.internal('Failed to create board');
  }
}
