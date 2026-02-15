import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TeamDetailClient } from '@/components/organization/TeamDetailClient';
import { getCanViewQualitySummaries } from '@/lib/quality-summary-access';

interface TeamPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const session = await auth();
  const { teamId } = await params;

  if (!session) {
    redirect('/login');
  }

  const isAdmin = session.user.permission === 'ADMIN' || session.user.permission === 'SUPER_ADMIN';
  const canViewQualitySummaries = await getCanViewQualitySummaries(session.user.id);

  return (
    <TeamDetailClient
      teamId={teamId}
      currentUserId={session.user.id}
      isAdmin={isAdmin}
      canViewQualitySummaries={canViewQualitySummaries}
    />
  );
}
