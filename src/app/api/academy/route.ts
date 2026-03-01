import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';

// GET /api/academy — landing page data
export async function GET(request: NextRequest) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const categoryId = request.nextUrl.searchParams.get('category');
    const isSuperAdmin = session.user.permission === 'SUPER_ADMIN';

    const statusFilter = isSuperAdmin ? undefined : { status: 'PUBLISHED' as const };
    const categoryFilter = categoryId ? { categoryId } : {};

    const [tutorials, courses, categories] = await Promise.all([
      prisma.academyTutorial.findMany({
        where: { ...statusFilter, ...categoryFilter },
        orderBy: { position: 'asc' },
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
          coinsReward: true,
          category: { select: { id: true, name: true, color: true, position: true, isActive: true } },
          badgeDefinition: { select: { id: true, name: true, iconUrl: true } },
          progress: {
            where: { userId: session.user.id },
            select: { passed: true, quizScore: true, attempts: true },
            take: 1,
          },
        },
      }),
      prisma.academyCourse.findMany({
        where: { ...statusFilter, ...categoryFilter },
        orderBy: { position: 'asc' },
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
          coinsReward: true,
          category: { select: { id: true, name: true, color: true, position: true, isActive: true } },
          badgeDefinition: { select: { id: true, name: true, iconUrl: true } },
          _count: { select: { lessons: true } },
          progress: {
            where: { userId: session.user.id },
            select: { passed: true, quizScore: true, attempts: true },
            take: 1,
          },
          lessons: {
            select: {
              id: true,
              progress: {
                where: { userId: session.user.id },
                select: { passed: true },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.academyCategory.findMany({
        where: { isActive: true },
        orderBy: { position: 'asc' },
        select: { id: true, name: true, color: true, position: true, isActive: true },
      }),
    ]);

    const tutorialItems = tutorials.map((t) => ({
      id: t.id,
      type: 'tutorial' as const,
      title: t.title,
      description: t.description,
      coverImage: t.coverImage,
      creatorName: t.creatorName,
      creatorAvatar: t.creatorAvatar,
      status: t.status,
      difficulty: t.difficulty,
      estimatedMinutes: t.estimatedMinutes,
      coinsReward: t.coinsReward,
      badgeReward: t.badgeDefinition,
      category: t.category,
      userProgress: t.progress[0]
        ? { passed: t.progress[0].passed, quizScore: t.progress[0].quizScore, attempts: t.progress[0].attempts }
        : null,
    }));

    const courseItems = courses.map((c) => {
      const lessonsCompleted = c.lessons.filter((l) => l.progress[0]?.passed).length;
      return {
        id: c.id,
        type: 'course' as const,
        title: c.title,
        description: c.description,
        coverImage: c.coverImage,
        creatorName: c.creatorName,
        creatorAvatar: c.creatorAvatar,
        status: c.status,
        difficulty: c.difficulty,
        estimatedMinutes: c.estimatedMinutes,
        coinsReward: c.coinsReward,
        badgeReward: c.badgeDefinition,
        category: c.category,
        lessonCount: c._count.lessons,
        userProgress: c.progress[0]
          ? {
              passed: c.progress[0].passed,
              quizScore: c.progress[0].quizScore,
              attempts: c.progress[0].attempts,
              lessonsCompleted,
              totalLessons: c._count.lessons,
            }
          : lessonsCompleted > 0
            ? { passed: false, quizScore: null, attempts: 0, lessonsCompleted, totalLessons: c._count.lessons }
            : null,
      };
    });

    return apiSuccess({ tutorials: tutorialItems, courses: courseItems, categories });
  } catch (error) {
    console.error('GET /api/academy error:', error);
    return ApiErrors.internal();
  }
}
