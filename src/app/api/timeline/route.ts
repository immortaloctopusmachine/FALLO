import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import type { TimelineData, BlockType, EventType } from '@/types';

// GET /api/timeline - Get aggregate timeline data for all user's boards
export async function GET() {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const [boards, blockTypes, eventTypes, teams, users] = await Promise.all([
      prisma.board.findMany({
        where: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
          archivedAt: null,
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  userCompanyRoles: {
                    include: {
                      companyRole: {
                        select: {
                          id: true,
                          name: true,
                          color: true,
                          position: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          weeklyAvailability: {
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
          timelineBlocks: {
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
            orderBy: { startDate: 'asc' },
          },
          timelineEvents: {
            include: {
              eventType: true,
            },
            orderBy: { startDate: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.blockType.findMany({
        orderBy: { position: 'asc' },
      }),
      prisma.eventType.findMany({
        orderBy: { position: 'asc' },
      }),
      prisma.team.findMany({
        where: { archivedAt: null },
        select: {
          id: true,
          name: true,
          color: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const mappedBlockTypes: BlockType[] = blockTypes.map((bt) => ({
      id: bt.id,
      name: bt.name,
      color: bt.color,
      description: bt.description,
      isDefault: bt.isDefault,
      position: bt.position,
    }));

    const mappedEventTypes: EventType[] = eventTypes.map((et) => ({
      id: et.id,
      name: et.name,
      color: et.color,
      icon: et.icon,
      description: et.description,
      isDefault: et.isDefault,
      position: et.position,
    }));

    const projects: TimelineData[] = boards.map((board) => ({
      board: {
        id: board.id,
        name: board.name,
        description: board.description,
        teamId: board.teamId,
        team: board.team,
        members: board.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
          userCompanyRoles: m.user.userCompanyRoles.map((ucr) => ({
            companyRole: {
              id: ucr.companyRole.id,
              name: ucr.companyRole.name,
              color: ucr.companyRole.color,
              position: ucr.companyRole.position,
            },
          })),
        })),
      },
      blocks: board.timelineBlocks.map((block) => ({
        id: block.id,
        startDate: block.startDate.toISOString(),
        endDate: block.endDate.toISOString(),
        position: block.position,
        blockType: {
          id: block.blockType.id,
          name: block.blockType.name,
          color: block.blockType.color,
          description: block.blockType.description,
          isDefault: block.blockType.isDefault,
          position: block.blockType.position,
        },
        list: block.list,
      })),
      availability: board.weeklyAvailability.map((a) => ({
        id: a.id,
        dedication: a.dedication,
        weekStart: a.weekStart.toISOString(),
        userId: a.userId,
        boardId: a.boardId,
        user: a.user,
      })),
      events: board.timelineEvents.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        eventType: {
          id: event.eventType.id,
          name: event.eventType.name,
          color: event.eventType.color,
          icon: event.eventType.icon,
          description: event.eventType.description,
          isDefault: event.eventType.isDefault,
          position: event.eventType.position,
        },
      })),
      blockTypes: mappedBlockTypes,
      eventTypes: mappedEventTypes,
    }));

    return apiSuccess({
      projects,
      teams,
      users,
      blockTypes: mappedBlockTypes,
      eventTypes: mappedEventTypes,
    });
  } catch (error) {
    console.error('Failed to fetch timeline data:', error);
    return ApiErrors.internal('Failed to fetch timeline data');
  }
}
