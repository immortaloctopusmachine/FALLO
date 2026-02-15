import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { StudioDetailClient } from '@/components/organization/StudioDetailClient';
import { getCanViewQualitySummaries } from '@/lib/quality-summary-access';

interface StudioPageProps {
  params: Promise<{ studioId: string }>;
}

export default async function StudioPage({ params }: StudioPageProps) {
  const session = await auth();
  const { studioId } = await params;

  if (!session) {
    redirect('/login');
  }

  const isAdmin = session.user.permission === 'ADMIN' || session.user.permission === 'SUPER_ADMIN';
  const canViewQualitySummaries = await getCanViewQualitySummaries(session.user.id);

  return (
    <StudioDetailClient
      studioId={studioId}
      isAdmin={isAdmin}
      canViewQualitySummaries={canViewQualitySummaries}
    />
  );
}
