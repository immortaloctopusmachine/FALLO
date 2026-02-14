import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/settings/epic-names
export async function GET() {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const epicNames = await prisma.epicNamePreset.findMany({
      orderBy: { position: 'asc' },
    });

    return apiSuccess(epicNames);
  } catch (error) {
    console.error('Failed to fetch epic names:', error);
    return ApiErrors.internal('Failed to fetch epic names');
  }
}

// POST /api/settings/epic-names
export async function POST(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';

    if (!name) {
      return ApiErrors.validation('Epic name is required');
    }

    const existing = await prisma.epicNamePreset.findUnique({
      where: { name },
      select: { id: true },
    });

    if (existing) {
      return ApiErrors.validation('This epic name already exists');
    }

    const maxPosition = await prisma.epicNamePreset.aggregate({
      _max: { position: true },
    });

    const created = await prisma.epicNamePreset.create({
      data: {
        name,
        description: description || null,
        position: (maxPosition._max.position ?? -1) + 1,
      },
    });

    return apiSuccess(created, 201);
  } catch (error) {
    console.error('Failed to create epic name:', error);
    return ApiErrors.internal('Failed to create epic name');
  }
}
