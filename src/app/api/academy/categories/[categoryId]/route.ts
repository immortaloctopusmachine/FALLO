import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ categoryId: string }>;
}

// PATCH /api/academy/categories/[categoryId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;
    if (session.user.permission !== 'SUPER_ADMIN') return ApiErrors.forbidden('Super admin access required');

    const { categoryId } = await params;
    const body = await request.json();
    const { name, color, isActive } = body;

    const existing = await prisma.academyCategory.findUnique({ where: { id: categoryId } });
    if (!existing) return ApiErrors.notFound('Category');

    const category = await prisma.academyCategory.update({
      where: { id: categoryId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
      },
      select: { id: true, name: true, color: true, position: true, isActive: true },
    });

    return apiSuccess(category);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return ApiErrors.conflict('A category with that name already exists');
    }
    console.error('PATCH /api/academy/categories/[categoryId] error:', error);
    return ApiErrors.internal();
  }
}

// DELETE /api/academy/categories/[categoryId] — soft deactivate
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;
    if (session.user.permission !== 'SUPER_ADMIN') return ApiErrors.forbidden('Super admin access required');

    const { categoryId } = await params;

    const existing = await prisma.academyCategory.findUnique({ where: { id: categoryId } });
    if (!existing) return ApiErrors.notFound('Category');

    await prisma.academyCategory.update({
      where: { id: categoryId },
      data: { isActive: false },
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/academy/categories/[categoryId] error:', error);
    return ApiErrors.internal();
  }
}
