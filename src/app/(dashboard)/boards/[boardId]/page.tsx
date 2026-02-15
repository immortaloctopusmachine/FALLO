import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { BoardDetailClient } from '@/components/boards/BoardDetailClient';
import { getCanViewQualitySummaries } from '@/lib/quality-summary-access';

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const session = await auth();
  const { boardId } = await params;

  if (!session) {
    redirect('/login');
  }

  const canViewQualitySummaries = await getCanViewQualitySummaries(session.user.id);

  return (
    <BoardDetailClient
      boardId={boardId}
      currentUserId={session.user.id}
      userPermission={session.user.permission}
      canViewQualitySummaries={canViewQualitySummaries}
    />
  );
}
