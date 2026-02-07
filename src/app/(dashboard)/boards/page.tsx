import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BoardsPageClient } from '@/components/boards/BoardsPageClient';

export default async function BoardsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const isAdmin = session.user.permission === 'ADMIN' || session.user.permission === 'SUPER_ADMIN';

  return (
    <BoardsPageClient
      isAdmin={isAdmin}
      currentUserId={session.user.id}
    />
  );
}
