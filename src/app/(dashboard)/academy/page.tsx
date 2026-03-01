import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AcademyPageClient } from '@/components/academy/AcademyPageClient';

export default async function AcademyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const isSuperAdmin = session.user.permission === 'SUPER_ADMIN';

  return <AcademyPageClient isSuperAdmin={isSuperAdmin} />;
}
