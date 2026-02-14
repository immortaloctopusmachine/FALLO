import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProjectDetailPageClient } from '@/components/projects/ProjectDetailPageClient';

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <ProjectDetailPageClient
      projectId={projectId}
      currentUserId={session.user.id}
      userPermission={session.user.permission}
    />
  );
}
