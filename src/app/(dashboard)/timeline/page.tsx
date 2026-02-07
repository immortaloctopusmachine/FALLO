import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TimelinePageClient } from '@/components/timeline/TimelinePageClient';

interface TimelinePageProps {
  searchParams: Promise<{ create?: string }>;
}

export default async function TimelinePage({ searchParams }: TimelinePageProps) {
  const params = await searchParams;
  const openCreateDialog = params.create === 'true';
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const isAdmin = session.user.permission === 'ADMIN' || session.user.permission === 'SUPER_ADMIN';

  return (
    <TimelinePageClient
      isAdmin={isAdmin}
      openCreateDialog={openCreateDialog}
    />
  );
}
