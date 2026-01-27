import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function BoardsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-heading">Boards</h1>
          <div className="flex items-center gap-4">
            <span className="text-body text-text-secondary">
              {session.user.name || session.user.email}
            </span>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h2 className="text-title text-text-secondary">No boards yet</h2>
          <p className="mt-2 text-body text-text-tertiary">
            Create your first board to get started.
          </p>
        </div>
      </main>
    </div>
  );
}
