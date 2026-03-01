import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ courseId: string; lessonId: string }>;
}

// GET /api/academy/courses/[courseId]/lessons/[lessonId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { courseId, lessonId } = await params;
    const isSuperAdmin = session.user.permission === 'SUPER_ADMIN';

    const course = await prisma.academyCourse.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        status: true,
        enforceOrder: true,
        lessons: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            position: true,
            progress: {
              where: { userId: session.user.id },
              select: { passed: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!course) return ApiErrors.notFound('Course');
    if (course.status !== 'PUBLISHED' && !isSuperAdmin) return ApiErrors.notFound('Course');

    const lesson = await prisma.academyLesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        description: true,
        position: true,
        passingScore: true,
        contentBlocks: true,
        quiz: true,
        courseId: true,
        createdAt: true,
        updatedAt: true,
        progress: {
          where: { userId: session.user.id },
          select: {
            id: true,
            userId: true,
            tutorialId: true,
            courseId: true,
            lessonId: true,
            quizScore: true,
            passed: true,
            attempts: true,
            coinsEarned: true,
            completedAt: true,
            lastAttemptAt: true,
          },
          take: 1,
        },
      },
    });

    if (!lesson || lesson.courseId !== courseId) return ApiErrors.notFound('Lesson');

    // Build prev/next lesson info
    const lessonIndex = course.lessons.findIndex((l) => l.id === lessonId);
    const prevLesson = lessonIndex > 0 ? course.lessons[lessonIndex - 1] : null;
    const nextLesson = lessonIndex < course.lessons.length - 1 ? course.lessons[lessonIndex + 1] : null;

    return apiSuccess({
      ...lesson,
      contentBlocks: lesson.contentBlocks,
      quiz: lesson.quiz,
      userProgress: lesson.progress[0] ?? null,
      progress: undefined,
      course: {
        id: course.id,
        title: course.title,
        enforceOrder: course.enforceOrder,
      },
      previousLesson: prevLesson
        ? { id: prevLesson.id, title: prevLesson.title, passed: prevLesson.progress[0]?.passed ?? false }
        : null,
      nextLesson: nextLesson
        ? { id: nextLesson.id, title: nextLesson.title }
        : null,
    });
  } catch (error) {
    console.error('GET /api/academy/courses/[courseId]/lessons/[lessonId] error:', error);
    return ApiErrors.internal();
  }
}

// PATCH /api/academy/courses/[courseId]/lessons/[lessonId] — SUPER_ADMIN only
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;
    if (session.user.permission !== 'SUPER_ADMIN') return ApiErrors.forbidden('Super admin access required');

    const { courseId, lessonId } = await params;

    const existing = await prisma.academyLesson.findUnique({ where: { id: lessonId } });
    if (!existing || existing.courseId !== courseId) return ApiErrors.notFound('Lesson');

    const body = await request.json();
    const { title, description, passingScore, contentBlocks, quiz, position } = body;

    const lesson = await prisma.academyLesson.update({
      where: { id: lessonId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(passingScore !== undefined && { passingScore }),
        ...(contentBlocks !== undefined && { contentBlocks }),
        ...(quiz !== undefined && { quiz }),
        ...(position !== undefined && { position }),
      },
      select: { id: true, title: true, position: true, updatedAt: true },
    });

    return apiSuccess(lesson);
  } catch (error) {
    console.error('PATCH /api/academy/courses/[courseId]/lessons/[lessonId] error:', error);
    return ApiErrors.internal();
  }
}

// DELETE /api/academy/courses/[courseId]/lessons/[lessonId] — SUPER_ADMIN only
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;
    if (session.user.permission !== 'SUPER_ADMIN') return ApiErrors.forbidden('Super admin access required');

    const { courseId, lessonId } = await params;

    const existing = await prisma.academyLesson.findUnique({ where: { id: lessonId } });
    if (!existing || existing.courseId !== courseId) return ApiErrors.notFound('Lesson');

    await prisma.academyLesson.delete({ where: { id: lessonId } });

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/academy/courses/[courseId]/lessons/[lessonId] error:', error);
    return ApiErrors.internal();
  }
}
