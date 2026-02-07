import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/studios - Get all studios
export async function GET() {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const studios = await prisma.studio.findMany({
      where: {
        archivedAt: null,
      },
      orderBy: { name: 'asc' },
      include: {
        teams: {
          where: { archivedAt: null },
          select: { id: true },
        },
        _count: {
          select: {
            teams: { where: { archivedAt: null } },
          },
        },
      },
    });

    return apiSuccess(studios);
  } catch (error) {
    console.error('Failed to fetch studios:', error);
    return ApiErrors.internal('Failed to fetch studios');
  }
}

// POST /api/studios - Create a new studio
export async function POST(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const { name, description, image, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrors.validation('Studio name is required');
    }

    const studio = await prisma.studio.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        image: image || null,
        color: color || null,
      },
      include: {
        _count: {
          select: { teams: true },
        },
      },
    });

    return apiSuccess(studio, 201);
  } catch (error) {
    console.error('Failed to create studio:', error);
    return ApiErrors.internal('Failed to create studio');
  }
}
