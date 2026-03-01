import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CourseDetailClient } from '@/components/academy/CourseDetailClient';

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: Props) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const isSuperAdmin = session.user.permission === 'SUPER_ADMIN';

  return <CourseDetailClient courseId={courseId} isSuperAdmin={isSuperAdmin} />;
}
