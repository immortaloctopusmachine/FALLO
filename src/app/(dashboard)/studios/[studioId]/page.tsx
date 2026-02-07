import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { StudioDetailClient } from '@/components/organization/StudioDetailClient';

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

  return <StudioDetailClient studioId={studioId} isAdmin={isAdmin} />;
}
