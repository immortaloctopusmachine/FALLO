import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TutorialDetailClient } from '@/components/academy/TutorialDetailClient';

interface Props {
  params: Promise<{ tutorialId: string }>;
}

export default async function TutorialPage({ params }: Props) {
  const { tutorialId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const isSuperAdmin = session.user.permission === 'SUPER_ADMIN';

  return <TutorialDetailClient tutorialId={tutorialId} isSuperAdmin={isSuperAdmin} />;
}
