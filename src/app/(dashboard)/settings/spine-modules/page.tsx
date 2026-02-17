import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SpineModulesSettingsClient } from '@/components/settings/SpineModulesSettingsClient';

export default async function SpineModulesSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permission: true },
  });

  const canManageSpineModules =
    user?.permission === 'ADMIN' || user?.permission === 'SUPER_ADMIN';

  if (!canManageSpineModules) {
    redirect('/settings/modules');
  }

  return <SpineModulesSettingsClient />;
}
