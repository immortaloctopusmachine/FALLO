import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';

// GET /api/academy/tutorials
export async function GET() {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const isSuperAdmin = session.user.permission === 'SUPER_ADMIN';
    const statusFilter = isSuperAdmin ? undefined : { status: 'PUBLISHED' as const };

    const tutorials = await prisma.academyTutorial.findMany({
      where: statusFilter,
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
        position: true,
        passingScore: true,
        categoryId: true,
        badgeDefinitionId: true,
        category: { select: { id: true, name: true, color: true, position: true, isActive: true } },
        badgeDefinition: { select: { id: true, name: true, iconUrl: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    return apiSuccess(tutorials);
  } catch (error) {
    console.error('GET /api/academy/tutorials error:', error);
    return ApiErrors.internal();
  }
}

// POST /api/academy/tutorials — SUPER_ADMIN only
export async function POST(request: NextRequest) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;
    if (session.user.permission !== 'SUPER_ADMIN') return ApiErrors.forbidden('Super admin access required');

    const body = await request.json();
    const { title, description, categoryId, difficulty, estimatedMinutes } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return ApiErrors.validation('title is required');
    }

    const maxPos = await prisma.academyTutorial.aggregate({ _max: { position: true } });

    const tutorial = await prisma.academyTutorial.create({
      data: {
        title: title.trim(),
        description: description || null,
        categoryId: categoryId || null,
        difficulty: difficulty || null,
        estimatedMinutes: estimatedMinutes ?? null,
        position: (maxPos._max.position ?? -1) + 1,
        createdById: session.user.id,
      },
      select: {
        id: true,
        title: true,
        status: true,
        position: true,
        createdAt: true,
      },
    });

    return apiSuccess(tutorial, 201);
  } catch (error) {
    console.error('POST /api/academy/tutorials error:', error);
    return ApiErrors.internal();
  }
}
