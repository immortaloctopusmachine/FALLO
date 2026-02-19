import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { UploadsSettingsClient } from '@/components/settings/UploadsSettingsClient';

export default async function UploadsSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (session.user.permission !== 'SUPER_ADMIN') {
    redirect('/settings/skills');
  }

  return <UploadsSettingsClient />;
}
