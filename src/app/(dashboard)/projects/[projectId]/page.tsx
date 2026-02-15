import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProjectDetailPageClient } from '@/components/projects/ProjectDetailPageClient';
import { getCanViewQualitySummaries } from '@/lib/quality-summary-access';

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const canViewQualitySummaries = await getCanViewQualitySummaries(session.user.id);

  return (
    <ProjectDetailPageClient
      projectId={projectId}
      currentUserId={session.user.id}
      userPermission={session.user.permission}
      canViewQualitySummaries={canViewQualitySummaries}
    />
  );
}
