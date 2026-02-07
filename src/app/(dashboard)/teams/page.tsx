import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TeamsPageClient } from '@/components/organization/TeamsPageClient';

export default async function TeamsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const isAdmin = session.user.permission === 'ADMIN' || session.user.permission === 'SUPER_ADMIN';

  return <TeamsPageClient isAdmin={isAdmin} />;
}
