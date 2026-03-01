import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ courseId: string }>;
}

// GET /api/academy/courses/[courseId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { courseId } = await params;
    const isSuperAdmin = session.user.permission === 'SUPER_ADMIN';

    const course = await prisma.academyCourse.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        creatorName: true,
        creatorAvatar: true,
        status: true,
        difficulty: true,
        estimatedMinutes: true,
        passingScore: true,
        coinsReward: true,
        position: true,
        finalQuiz: true,
        enforceOrder: true,
        categoryId: true,
        badgeDefinitionId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, name: true, color: true, position: true, isActive: true } },
        badgeDefinition: { select: { id: true, name: true, iconUrl: true } },
        lessons: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            position: true,
            passingScore: true,
            contentBlocks: true,
            quiz: true,
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
        },
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

    if (!course) return ApiErrors.notFound('Course');
    if (course.status !== 'PUBLISHED' && !isSuperAdmin) return ApiErrors.notFound('Course');

    // Build lesson progress map and clean up lesson data
    const lessonProgress: Record<string, unknown> = {};
    const lessons = course.lessons.map((lesson) => {
      const lp = lesson.progress[0] ?? null;
      if (lp) lessonProgress[lesson.id] = lp;
      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        position: lesson.position,
        passingScore: lesson.passingScore,
        contentBlocks: lesson.contentBlocks,
        quiz: lesson.quiz,
        courseId,
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt,
      };
    });

    return apiSuccess({
      ...course,
      finalQuiz: course.finalQuiz,
      badgeReward: course.badgeDefinition,
      userProgress: course.progress[0] ?? null,
      lessonProgress,
      lessons,
      progress: undefined,
      badgeDefinition: undefined,
    });
  } catch (error) {
    console.error('GET /api/academy/courses/[courseId] error:', error);
    return ApiErrors.internal();
  }
}

// PATCH /api/academy/courses/[courseId] — SUPER_ADMIN only
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;
    if (session.user.permission !== 'SUPER_ADMIN') return ApiErrors.forbidden('Super admin access required');

    const { courseId } = await params;

    const existing = await prisma.academyCourse.findUnique({ where: { id: courseId } });
    if (!existing) return ApiErrors.notFound('Course');

    const body = await request.json();
    const {
      title, description, coverImage, creatorName, creatorAvatar,
      status, difficulty, estimatedMinutes, passingScore, coinsReward,
      finalQuiz, enforceOrder, categoryId, badgeDefinitionId, position,
    } = body;

    const course = await prisma.academyCourse.update({
      where: { id: courseId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(coverImage !== undefined && { coverImage }),
        ...(creatorName !== undefined && { creatorName }),
        ...(creatorAvatar !== undefined && { creatorAvatar }),
        ...(status !== undefined && { status }),
        ...(difficulty !== undefined && { difficulty }),
        ...(estimatedMinutes !== undefined && { estimatedMinutes }),
        ...(passingScore !== undefined && { passingScore }),
        ...(coinsReward !== undefined && { coinsReward }),
        ...(finalQuiz !== undefined && { finalQuiz }),
        ...(enforceOrder !== undefined && { enforceOrder }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(badgeDefinitionId !== undefined && { badgeDefinitionId: badgeDefinitionId || null }),
        ...(position !== undefined && { position }),
      },
      select: { id: true, title: true, status: true, updatedAt: true },
    });

    return apiSuccess(course);
  } catch (error) {
    console.error('PATCH /api/academy/courses/[courseId] error:', error);
    return ApiErrors.internal();
  }
}

// DELETE /api/academy/courses/[courseId] — SUPER_ADMIN only (archives)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;
    if (session.user.permission !== 'SUPER_ADMIN') return ApiErrors.forbidden('Super admin access required');

    const { courseId } = await params;

    const existing = await prisma.academyCourse.findUnique({ where: { id: courseId } });
    if (!existing) return ApiErrors.notFound('Course');

    await prisma.academyCourse.update({
      where: { id: courseId },
      data: { status: 'ARCHIVED' },
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/academy/courses/[courseId] error:', error);
    return ApiErrors.internal();
  }
}
