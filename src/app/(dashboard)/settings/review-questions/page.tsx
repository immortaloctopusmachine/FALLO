import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ReviewQuestionsSettingsClient } from '@/components/settings/ReviewQuestionsSettingsClient';

export default async function ReviewQuestionsSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (session.user.permission !== 'SUPER_ADMIN') {
    redirect('/settings/skills');
  }

  return <ReviewQuestionsSettingsClient />;
}
