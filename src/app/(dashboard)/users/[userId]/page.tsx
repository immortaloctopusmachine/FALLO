import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserDetailClient } from '@/components/users/UserDetailClient';
import { getCanViewQualitySummaries } from '@/lib/quality-summary-access';

interface UserPageProps {
  params: Promise<{ userId: string }>;
}

export default async function UserPage({ params }: UserPageProps) {
  const session = await auth();
  const { userId } = await params;

  if (!session) {
    redirect('/login');
  }

  const isSuperAdmin = session.user.permission === 'SUPER_ADMIN';
  const canManageSlackLink =
    session.user.permission === 'ADMIN' || session.user.permission === 'SUPER_ADMIN';
  const canViewQualitySummaries = await getCanViewQualitySummaries(session.user.id);

  return (
    <UserDetailClient
      userId={userId}
      isSuperAdmin={isSuperAdmin}
      canManageSlackLink={canManageSlackLink}
      canViewQualitySummaries={canViewQualitySummaries}
    />
  );
}
