import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserDetailClient } from '@/components/users/UserDetailClient';

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

  return <UserDetailClient userId={userId} isSuperAdmin={isSuperAdmin} />;
}
