import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { BoardCard } from '@/components/boards/BoardCard';
import { ArchivedBoardsSection } from '@/components/boards/ArchivedBoardsSection';

export default async function BoardsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Fetch active boards
  const activeBoards = await prisma.board.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
      archivedAt: null,
    },
    include: {
      members: true,
      lists: {
        select: { id: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Fetch archived boards
  const archivedBoards = await prisma.board.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
      archivedAt: { not: null },
    },
    include: {
      members: true,
      lists: {
        select: { id: true },
      },
    },
    orderBy: { archivedAt: 'desc' },
  });

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Helper to check if user is admin for a board
  type BoardWithMembers = typeof activeBoards[0];
  const isAdminForBoard = (board: BoardWithMembers) => {
    const membership = board.members.find(m => m.userId === session.user.id);
    return membership?.role === 'ADMIN' || membership?.role === 'SUPER_ADMIN';
  };

  // Separate regular boards from templates
  const regularBoards = activeBoards.filter(b => !b.isTemplate);
  const templateBoards = activeBoards.filter(b => b.isTemplate);

  // Prepare archived boards data for client component
  const archivedBoardsData = archivedBoards.map(board => ({
    id: board.id,
    name: board.name,
    description: board.description,
    listCount: board.lists.length,
    memberCount: board.members.length,
    isTemplate: board.isTemplate,
    isAdmin: isAdminForBoard(board),
  }));

  return (
    <main className="p-6 flex-1">
        {/* Regular Boards Section */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-title font-medium text-text-secondary">
            Your Boards ({regularBoards.length})
          </h2>
          {isAdmin && (
            <Link
              href="/timeline?create=true"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-body font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Project
            </Link>
          )}
        </div>

        {regularBoards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <h3 className="text-title text-text-secondary">No boards yet</h3>
            <p className="mt-2 text-body text-text-tertiary">
              Create your first board to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {regularBoards.map((board) => (
              <BoardCard
                key={board.id}
                id={board.id}
                name={board.name}
                description={board.description}
                listCount={board.lists.length}
                memberCount={board.members.length}
                isTemplate={board.isTemplate}
                isAdmin={isAdminForBoard(board)}
              />
            ))}
          </div>
        )}

        {/* Templates Section */}
        {templateBoards.length > 0 && (
          <div className="mt-10">
            <div className="mb-6">
              <h2 className="text-title font-medium text-text-secondary">
                Templates ({templateBoards.length})
              </h2>
              <p className="text-caption text-text-tertiary mt-1">
                Templates can be used to create new boards with predefined cards and structure.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templateBoards.map((board) => (
                <BoardCard
                  key={board.id}
                  id={board.id}
                  name={board.name}
                  description={board.description}
                  listCount={board.lists.length}
                  memberCount={board.members.length}
                  isTemplate={board.isTemplate}
                  isAdmin={isAdminForBoard(board)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Archived Boards Section */}
        {archivedBoardsData.length > 0 && (
          <ArchivedBoardsSection boards={archivedBoardsData} />
        )}
    </main>
  );
}
