import { prisma } from '@/lib/prisma';
import { BOARD_TEMPLATES, calculateListDates } from '@/lib/list-templates';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { PHASE_SEARCH_TERMS } from '@/lib/constants';
import type { BoardTemplateType, ListViewType, ListPhase, BoardSettings } from '@/types';

// GET /api/boards - Get all boards for current user
// Query params:
//   ?archived=true  - return archived boards
//   ?projects=true  - return non-template boards with team + member data
export async function GET(request: Request) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const archived = searchParams.get('archived') === 'true';
    const projects = searchParams.get('projects') === 'true';

    if (projects) {
      const boards = await prisma.board.findMany({
        where: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
          archivedAt: null,
          isTemplate: false,
        },
        include: {
          team: {
            select: { id: true, name: true, color: true },
          },
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
        },
        orderBy: { name: 'asc' },
      });

      return apiSuccess(boards);
    }

    if (archived) {
      const boards = await prisma.board.findMany({
        where: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
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

    // Default: active boards with members + lists
    const boards = await prisma.board.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
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

    const body = await request.json();
    const { name, description, template = 'BLANK', teamId, startDate, memberIds } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrors.validation('Board name is required');
    }

    // Get template configuration
    const templateType = template as BoardTemplateType;
    const templateConfig = BOARD_TEMPLATES[templateType] || BOARD_TEMPLATES.BLANK;

    // Calculate list dates if startDate is provided
    let listDates: { listName: string; startDate: Date; endDate: Date; durationDays?: number }[] = [];
    if (startDate && templateType !== 'BLANK') {
      listDates = calculateListDates(templateConfig, new Date(startDate));
    }

    // Build list creation data from template
    const listsToCreate = [
      ...templateConfig.taskLists.map((list) => ({
        name: list.name,
        position: list.position,
        viewType: list.viewType as ListViewType,
        phase: list.phase as ListPhase | undefined,
        color: list.color,
        durationWeeks: list.durationWeeks,
      })),
      ...templateConfig.planningLists.map((list, idx) => {
        // Find matching date entry if dates were calculated
        const dateEntry = listDates.find((d) =>
          d.listName.toLowerCase() === list.name.toLowerCase()
        );
        return {
          name: list.name,
          position: templateConfig.taskLists.length + idx,
          viewType: list.viewType as ListViewType,
          phase: list.phase as ListPhase | undefined,
          color: list.color,
          durationWeeks: list.durationWeeks,
          durationDays: dateEntry?.durationDays,
          startDate: dateEntry?.startDate,
          endDate: dateEntry?.endDate,
        };
      }),
    ];

    // Store which template was used in settings (for non-BLANK templates)
    // Using Partial<BoardSettings> to allow incremental building, cast for Prisma JSON field
    const settings: Partial<BoardSettings> = templateType !== 'BLANK'
      ? { listTemplate: templateType as BoardSettings['listTemplate'] }
      : {};

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

    const board = await prisma.board.create({
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
    if (startDate && templateType !== 'BLANK') {
      const planningLists = await prisma.list.findMany({
        where: {
          boardId: board.id,
          viewType: 'PLANNING',
          startDate: { not: null },
          endDate: { not: null },
        },
        orderBy: { position: 'asc' },
      });

      // Create timeline blocks for each planning list
      let blockPosition = 0;
      for (const list of planningLists) {
        // Find matching block type using centralized phase search terms
        const searchTerms = list.phase ? PHASE_SEARCH_TERMS[list.phase as keyof typeof PHASE_SEARCH_TERMS] : null;
        const listNameLower = list.name.toLowerCase();

        let blockType = null;

        // First try by phase
        if (searchTerms) {
          for (const term of searchTerms) {
            blockType = await prisma.blockType.findFirst({
              where: { name: { contains: term, mode: 'insensitive' } },
            });
            if (blockType) break;
          }
        }

        // Try by list name
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

        // Use default or create new
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

        // Create timeline block
        await prisma.timelineBlock.create({
          data: {
            boardId: board.id,
            blockTypeId: blockType.id,
            listId: list.id,
            startDate: list.startDate!,
            endDate: list.endDate!,
            position: blockPosition++,
          },
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

    return apiSuccess(board, 201);
  } catch (error) {
    console.error('Failed to create board:', error);
    return ApiErrors.internal('Failed to create board');
  }
}
