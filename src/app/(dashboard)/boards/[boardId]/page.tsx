import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BoardHeader } from '@/components/boards/BoardHeader';
import { BoardView } from '@/components/boards/BoardView';
import type { Board, Card, List } from '@/types';

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const session = await auth();
  const { boardId } = await params;

  if (!session) {
    redirect('/login');
  }

  const boardData = await prisma.board.findFirst({
    where: {
      id: boardId,
      members: {
        some: {
          userId: session.user.id,
        },
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
              role: true,
            },
          },
        },
      },
      lists: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            where: { archivedAt: null },
            orderBy: { position: 'asc' },
            include: {
              assignees: {
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
              _count: {
                select: {
                  attachments: true,
                  comments: true,
                },
              },
              checklists: {
                include: {
                  items: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!boardData) {
    notFound();
  }

  // Transform the data to match our types
  const board: Board = {
    id: boardData.id,
    name: boardData.name,
    description: boardData.description,
    isTemplate: boardData.isTemplate,
    settings: boardData.settings as Board['settings'],
    createdAt: boardData.createdAt.toISOString(),
    updatedAt: boardData.updatedAt.toISOString(),
    archivedAt: boardData.archivedAt?.toISOString() || null,
    members: boardData.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      user: {
        id: m.user.id,
        email: m.user.email,
        name: m.user.name,
        image: m.user.image,
        role: m.user.role as 'VIEWER' | 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN',
      },
      role: m.role as 'VIEWER' | 'MEMBER' | 'ADMIN' | 'SUPER_ADMIN',
      joinedAt: m.joinedAt.toISOString(),
    })),
    lists: boardData.lists.map((list) => ({
      id: list.id,
      name: list.name,
      position: list.position,
      boardId: list.boardId,
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
      cards: list.cards.map((card) => ({
        id: card.id,
        type: card.type as Card['type'],
        title: card.title,
        description: card.description,
        position: card.position,
        color: card.color,
        featureImage: card.featureImage,
        listId: card.listId,
        parentId: card.parentId,
        createdAt: card.createdAt.toISOString(),
        updatedAt: card.updatedAt.toISOString(),
        archivedAt: card.archivedAt?.toISOString() || null,
        taskData: card.taskData as unknown,
        userStoryData: card.userStoryData as unknown,
        epicData: card.epicData as unknown,
        utilityData: card.utilityData as unknown,
        assignees: card.assignees.map((a) => ({
          id: a.id,
          userId: a.userId,
          user: {
            id: a.user.id,
            email: a.user.email,
            name: a.user.name,
            image: a.user.image,
            role: 'MEMBER' as const,
          },
          assignedAt: a.assignedAt.toISOString(),
        })),
        checklists: card.checklists.map((cl) => ({
          id: cl.id,
          name: cl.name,
          type: cl.type as 'todo' | 'feedback',
          position: cl.position,
          items: cl.items.map((item) => ({
            id: item.id,
            content: item.content,
            isComplete: item.isComplete,
            position: item.position,
          })),
        })),
        _count: card._count,
      })) as Card[],
    })) as List[],
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <BoardHeader name={board.name} memberCount={board.members.length} />
      <div className="flex-1 overflow-hidden">
        <BoardView board={board} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
