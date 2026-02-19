import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { SpineModulesSettingsClient } from '@/components/settings/SpineModulesSettingsClient';

export default async function SpineModulesSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const canManageSpineModules =
    session.user.permission === 'ADMIN' || session.user.permission === 'SUPER_ADMIN';

  if (!canManageSpineModules) {
    redirect('/settings/modules');
  }

  return <SpineModulesSettingsClient />;
}
