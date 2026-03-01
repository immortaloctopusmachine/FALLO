import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';

// PUT /api/academy/categories/reorder
export async function PUT(request: NextRequest) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;
    if (session.user.permission !== 'SUPER_ADMIN') return ApiErrors.forbidden('Super admin access required');

    const body = await request.json();
    const { categoryIds } = body;

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return ApiErrors.validation('categoryIds must be a non-empty array');
    }

    await prisma.$transaction(
      categoryIds.map((id: string, index: number) =>
        prisma.academyCategory.update({
          where: { id },
          data: { position: index },
        })
      )
    );

    return apiSuccess({ reordered: true });
  } catch (error) {
    console.error('PUT /api/academy/categories/reorder error:', error);
    return ApiErrors.internal();
  }
}
