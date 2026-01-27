import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BoardCard } from '@/components/boards/BoardCard';
import { CreateBoardDialog } from '@/components/boards/CreateBoardDialog';

export default async function BoardsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

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
      members: true,
      lists: {
        select: { id: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-heading font-semibold">Boards</h1>
          <div className="flex items-center gap-4">
            <span className="text-body text-text-secondary">
              {session.user.name || session.user.email}
            </span>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-title font-medium text-text-secondary">
            Your Boards ({boards.length})
          </h2>
          <CreateBoardDialog />
        </div>

        {boards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <h3 className="text-title text-text-secondary">No boards yet</h3>
            <p className="mt-2 text-body text-text-tertiary">
              Create your first board to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                id={board.id}
                name={board.name}
                description={board.description}
                listCount={board.lists.length}
                memberCount={board.members.length}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
