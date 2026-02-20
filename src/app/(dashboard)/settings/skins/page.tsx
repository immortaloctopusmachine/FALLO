import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { SkinsSettingsClient } from '@/components/settings/SkinsSettingsClient';

export default async function SkinsSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (session.user.permission !== 'SUPER_ADMIN') {
    redirect('/settings/skills');
  }

  return <SkinsSettingsClient />;
}
