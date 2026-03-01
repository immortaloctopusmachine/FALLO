import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { UserBadgesPageClient } from '@/components/rewards/UserBadgesPageClient';

export default async function BadgesPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return <UserBadgesPageClient />;
}
