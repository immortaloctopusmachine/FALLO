import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LessonDetailClient } from '@/components/academy/LessonDetailClient';

interface Props {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export default async function LessonPage({ params }: Props) {
  const { courseId, lessonId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const isSuperAdmin = session.user.permission === 'SUPER_ADMIN';

  return <LessonDetailClient courseId={courseId} lessonId={lessonId} isSuperAdmin={isSuperAdmin} />;
}
