import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import { normalizeImageTags } from '@/lib/module-image-tags';

// GET /api/settings/module-images
export async function GET(request: Request) {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    const images = await prisma.moduleImageAsset.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { tags: { array_contains: [q] } },
            ],
          }
        : undefined,
      orderBy: { updatedAt: 'desc' },
    });

    return apiSuccess(images);
  } catch (error) {
    console.error('Failed to fetch module images:', error);
    return ApiErrors.internal('Failed to fetch module images');
  }
}

// POST /api/settings/module-images
export async function POST(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    const tags = normalizeImageTags(body?.tags);

    if (!name) return ApiErrors.validation('Image name is required');
    if (!url) return ApiErrors.validation('Image url is required');

    const existing = await prisma.moduleImageAsset.findUnique({
      where: { url },
    });

    if (existing) {
      const existingTags = Array.isArray(existing.tags) ? (existing.tags as unknown[]) : [];
      const mergedTags = normalizeImageTags([...existingTags, ...tags]);
      const updated = await prisma.moduleImageAsset.update({
        where: { id: existing.id },
        data: {
          name,
          tags: mergedTags,
        },
      });
      return apiSuccess(updated);
    }

    const created = await prisma.moduleImageAsset.create({
      data: { name, url, tags },
    });

    return apiSuccess(created, 201);
  } catch (error) {
    console.error('Failed to create module image:', error);
    return ApiErrors.internal('Failed to create module image');
  }
}
