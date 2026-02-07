import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { UserTimeStatsClient } from '@/components/users/UserTimeStatsClient';

export default async function UserTimePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  if (!user) notFound();

  // Fetch boards user has access to (for filter dropdown)
  const boards = await prisma.board.findMany({
    where: {
      members: { some: { userId } },
      archivedAt: null,
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <UserTimeStatsClient
      user={user}
      boards={boards}
      currentUserId={session.user.id}
    />
  );
}
