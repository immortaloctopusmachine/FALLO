import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';

// GET /api/academy/categories
export async function GET() {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const categories = await prisma.academyCategory.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, color: true, position: true, isActive: true },
    });

    return apiSuccess(categories);
  } catch (error) {
    console.error('GET /api/academy/categories error:', error);
    return ApiErrors.internal();
  }
}

// POST /api/academy/categories — SUPER_ADMIN only
export async function POST(request: NextRequest) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;
    if (session.user.permission !== 'SUPER_ADMIN') return ApiErrors.forbidden('Super admin access required');

    const body = await request.json();
    const { name, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrors.validation('name is required');
    }

    const maxPos = await prisma.academyCategory.aggregate({ _max: { position: true } });

    const category = await prisma.academyCategory.create({
      data: {
        name: name.trim(),
        color: color || null,
        position: (maxPos._max.position ?? -1) + 1,
      },
      select: { id: true, name: true, color: true, position: true, isActive: true },
    });

    return apiSuccess(category, 201);
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return ApiErrors.conflict('A category with that name already exists');
    }
    console.error('POST /api/academy/categories error:', error);
    return ApiErrors.internal();
  }
}
