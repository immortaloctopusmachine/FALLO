import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/settings/block-types - Get all block types
export async function GET() {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const blockTypes = await prisma.blockType.findMany({
      where: {
        studioId: null, // Global block types only for now
      },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { blocks: true },
        },
      },
    });

    return apiSuccess(blockTypes);
  } catch (error) {
    console.error('Failed to fetch block types:', error);
    return ApiErrors.internal('Failed to fetch block types');
  }
}

// POST /api/settings/block-types - Create a new block type
export async function POST(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrors.validation('Block type name is required');
    }

    if (!color || typeof color !== 'string') {
      return ApiErrors.validation('Block type color is required');
    }

    // Get the highest position
    const maxPosition = await prisma.blockType.aggregate({
      where: { studioId: null },
      _max: { position: true },
    });

    const blockType = await prisma.blockType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color,
        position: (maxPosition._max.position ?? -1) + 1,
        isDefault: false,
        studioId: null,
      },
    });

    return apiSuccess(blockType, 201);
  } catch (error) {
    console.error('Failed to create block type:', error);
    return ApiErrors.internal('Failed to create block type');
  }
}
