import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
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

  // Template boards should not be accessible as projects - redirect to board view
  const board = await prisma.board.findUnique({
    where: { id: projectId },
    select: { isTemplate: true },
  });

  if (board?.isTemplate) {
    redirect(`/boards/${projectId}`);
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
