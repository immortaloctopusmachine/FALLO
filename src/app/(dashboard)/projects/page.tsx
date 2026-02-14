import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProjectsPageClient } from '@/components/projects/ProjectsPageClient';

export default async function ProjectsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const isAdmin = session.user.permission === 'ADMIN' || session.user.permission === 'SUPER_ADMIN';
  const isSuperAdmin = session.user.permission === 'SUPER_ADMIN';

  return <ProjectsPageClient isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} currentUserId={session.user.id} />;
}
