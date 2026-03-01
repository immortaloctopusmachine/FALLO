import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { RewardsSettingsClient } from '@/components/settings/RewardsSettingsClient';

export default async function RewardsSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const isAdmin =
    session.user.permission === 'ADMIN' || session.user.permission === 'SUPER_ADMIN';

  if (!isAdmin) {
    redirect('/settings/skills');
  }

  return <RewardsSettingsClient />;
}
