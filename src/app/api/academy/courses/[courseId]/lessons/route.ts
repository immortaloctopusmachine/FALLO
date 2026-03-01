import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';

// POST /api/academy/courses/[courseId]/lessons — SUPER_ADMIN only
export async function POST(
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
    const { title, description } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return ApiErrors.validation('title is required');
    }

    const maxPos = await prisma.academyLesson.aggregate({
      where: { courseId },
      _max: { position: true },
    });

    const lesson = await prisma.academyLesson.create({
      data: {
        courseId,
        title: title.trim(),
        description: description || null,
        position: (maxPos._max.position ?? -1) + 1,
      },
      select: {
        id: true,
        title: true,
        position: true,
        courseId: true,
        createdAt: true,
      },
    });

    return apiSuccess(lesson, 201);
  } catch (error) {
    console.error('POST /api/academy/courses/[courseId]/lessons error:', error);
    return ApiErrors.internal();
  }
}
