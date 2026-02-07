import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/settings/tags - Get all tags
export async function GET() {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const tags = await prisma.tag.findMany({
      where: {
        studioId: null, // Global tags only for now
      },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { cardTags: true },
        },
      },
    });

    return apiSuccess(tags);
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return ApiErrors.internal('Failed to fetch tags');
  }
}

// POST /api/settings/tags - Create a new tag
export async function POST(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrors.validation('Tag name is required');
    }

    // Check for duplicate name
    const existing = await prisma.tag.findFirst({
      where: {
        studioId: null,
        name: name.trim(),
      },
    });

    if (existing) {
      return ApiErrors.validation('A tag with this name already exists');
    }

    // Get the highest position
    const maxPosition = await prisma.tag.aggregate({
      where: { studioId: null },
      _max: { position: true },
    });

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        position: (maxPosition._max.position ?? -1) + 1,
        studioId: null,
      },
    });

    return apiSuccess(tag, 201);
  } catch (error) {
    console.error('Failed to create tag:', error);
    return ApiErrors.internal('Failed to create tag');
  }
}
