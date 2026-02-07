import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { StudiosPageClient } from '@/components/organization/StudiosPageClient';

export default async function StudiosPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const isAdmin = session.user.permission === 'ADMIN' || session.user.permission === 'SUPER_ADMIN';

  return <StudiosPageClient isAdmin={isAdmin} />;
}
