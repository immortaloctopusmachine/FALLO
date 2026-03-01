import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';

// PUT /api/academy/courses/[courseId]/lessons/reorder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;
    if (session.user.permission !== 'SUPER_ADMIN') return ApiErrors.forbidden('Super admin access required');

    const { courseId } = await params;

    const course = await prisma.academyCourse.findUnique({ where: { id: courseId } });
    if (!course) return ApiErrors.notFound('Course');

    const body = await request.json();
    const { lessonIds } = body;

    if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
      return ApiErrors.validation('lessonIds must be a non-empty array');
    }

    await prisma.$transaction(
      lessonIds.map((id: string, index: number) =>
        prisma.academyLesson.update({
          where: { id },
          data: { position: index },
        })
      )
    );

    return apiSuccess({ reordered: true });
  } catch (error) {
    console.error('PUT /api/academy/courses/[courseId]/lessons/reorder error:', error);
    return ApiErrors.internal();
  }
}
