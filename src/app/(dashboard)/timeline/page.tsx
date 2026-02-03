import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { TimelineView } from '@/components/timeline/TimelineView';
import type { TimelineData, BlockType, EventType } from '@/types';

export const dynamic = 'force-dynamic';

interface TimelinePageProps {
  searchParams: Promise<{ create?: string }>;
}

export default async function TimelinePage({ searchParams }: TimelinePageProps) {
  const params = await searchParams;
  const openCreateDialog = params.create === 'true';
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Fetch all boards user is a member of
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
      team: {
        select: {
          id: true,
          name: true,
          color: true,
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
          assignments: {
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
  });

  // Fetch all block types and event types
  const [blockTypes, eventTypes] = await Promise.all([
    prisma.blockType.findMany({
      orderBy: { position: 'asc' },
    }),
    prisma.eventType.findMany({
      orderBy: { position: 'asc' },
    }),
  ]);

  // Transform data
  const timelineData: TimelineData[] = boards.map((board) => ({
    board: {
      id: board.id,
      name: board.name,
      description: board.description,
      teamId: board.teamId,
      team: board.team,
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
      assignments: block.assignments.map((a) => ({
        id: a.id,
        dedication: a.dedication,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate.toISOString(),
        user: a.user,
      })),
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
    blockTypes: blockTypes.map((bt): BlockType => ({
      id: bt.id,
      name: bt.name,
      color: bt.color,
      description: bt.description,
      isDefault: bt.isDefault,
      position: bt.position,
    })),
    eventTypes: eventTypes.map((et): EventType => ({
      id: et.id,
      name: et.name,
      color: et.color,
      icon: et.icon,
      description: et.description,
      isDefault: et.isDefault,
      position: et.position,
    })),
  }));

  // Fetch all teams for filtering
  const teams = await prisma.team.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      name: true,
      color: true,
    },
    orderBy: { name: 'asc' },
  });

  // Fetch all users for filtering
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <TimelineView
      projects={timelineData}
      teams={teams}
      users={users}
      blockTypes={blockTypes.map((bt): BlockType => ({
        id: bt.id,
        name: bt.name,
        color: bt.color,
        description: bt.description,
        isDefault: bt.isDefault,
        position: bt.position,
      }))}
      eventTypes={eventTypes.map((et): EventType => ({
        id: et.id,
        name: et.name,
        color: et.color,
        icon: et.icon,
        description: et.description,
        isDefault: et.isDefault,
        position: et.position,
      }))}
      isAdmin={isAdmin}
      openCreateDialog={openCreateDialog}
    />
  );
}
