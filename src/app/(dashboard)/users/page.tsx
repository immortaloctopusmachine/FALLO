import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UsersPageClient } from '@/components/users/UsersPageClient';

export default async function UsersPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const isSuperAdmin = session.user.permission === 'SUPER_ADMIN';

  return <UsersPageClient isSuperAdmin={isSuperAdmin} />;
}
