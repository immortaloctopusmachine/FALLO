import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ tutorialId: string }>;
}

// GET /api/academy/tutorials/[tutorialId]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { tutorialId } = await params;
    const isSuperAdmin = session.user.permission === 'SUPER_ADMIN';

    const tutorial = await prisma.academyTutorial.findUnique({
      where: { id: tutorialId },
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
        contentBlocks: true,
        quiz: true,
        categoryId: true,
        badgeDefinitionId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, name: true, color: true, position: true, isActive: true } },
        badgeDefinition: { select: { id: true, name: true, iconUrl: true } },
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

    if (!tutorial) return ApiErrors.notFound('Tutorial');
    if (tutorial.status !== 'PUBLISHED' && !isSuperAdmin) return ApiErrors.notFound('Tutorial');

    return apiSuccess({
      ...tutorial,
      contentBlocks: tutorial.contentBlocks,
      quiz: tutorial.quiz,
      badgeReward: tutorial.badgeDefinition,
      userProgress: tutorial.progress[0] ?? null,
      progress: undefined,
      badgeDefinition: undefined,
    });
  } catch (error) {
    console.error('GET /api/academy/tutorials/[tutorialId] error:', error);
    return ApiErrors.internal();
  }
}

// PATCH /api/academy/tutorials/[tutorialId] — SUPER_ADMIN only
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;
    if (session.user.permission !== 'SUPER_ADMIN') return ApiErrors.forbidden('Super admin access required');

    const { tutorialId } = await params;

    const existing = await prisma.academyTutorial.findUnique({ where: { id: tutorialId } });
    if (!existing) return ApiErrors.notFound('Tutorial');

    const body = await request.json();
    const {
      title, description, coverImage, creatorName, creatorAvatar,
      status, difficulty, estimatedMinutes, passingScore, coinsReward,
      contentBlocks, quiz, categoryId, badgeDefinitionId, position,
    } = body;

    const tutorial = await prisma.academyTutorial.update({
      where: { id: tutorialId },
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
        ...(contentBlocks !== undefined && { contentBlocks }),
        ...(quiz !== undefined && { quiz }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(badgeDefinitionId !== undefined && { badgeDefinitionId: badgeDefinitionId || null }),
        ...(position !== undefined && { position }),
      },
      select: { id: true, title: true, status: true, updatedAt: true },
    });

    return apiSuccess(tutorial);
  } catch (error) {
    console.error('PATCH /api/academy/tutorials/[tutorialId] error:', error);
    return ApiErrors.internal();
  }
}

// DELETE /api/academy/tutorials/[tutorialId] — SUPER_ADMIN only (archives)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;
    if (session.user.permission !== 'SUPER_ADMIN') return ApiErrors.forbidden('Super admin access required');

    const { tutorialId } = await params;

    const existing = await prisma.academyTutorial.findUnique({ where: { id: tutorialId } });
    if (!existing) return ApiErrors.notFound('Tutorial');

    await prisma.academyTutorial.update({
      where: { id: tutorialId },
      data: { status: 'ARCHIVED' },
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/academy/tutorials/[tutorialId] error:', error);
    return ApiErrors.internal();
  }
}
