import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UploadsSettingsClient } from '@/components/settings/UploadsSettingsClient';

export default async function UploadsSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permission: true },
  });

  if (user?.permission !== 'SUPER_ADMIN') {
    redirect('/settings/skills');
  }

  return <UploadsSettingsClient />;
}
