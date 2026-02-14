import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import { normalizeImageTags } from '@/lib/module-image-tags';

// PATCH /api/settings/module-images/[imageId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { imageId } = await params;
    const body = await request.json();

    const existing = await prisma.moduleImageAsset.findUnique({ where: { id: imageId } });
    if (!existing) return ApiErrors.notFound('Module image');

    const updateData: Record<string, unknown> = {};

    if (body?.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) return ApiErrors.validation('Image name cannot be empty');
      updateData.name = name;
    }

    if (body?.tags !== undefined) {
      updateData.tags = normalizeImageTags(body.tags);
    }

    const updated = await prisma.moduleImageAsset.update({
      where: { id: imageId },
      data: updateData,
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error('Failed to update module image:', error);
    return ApiErrors.internal('Failed to update module image');
  }
}

// DELETE /api/settings/module-images/[imageId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { imageId } = await params;

    const existing = await prisma.moduleImageAsset.findUnique({ where: { id: imageId } });
    if (!existing) return ApiErrors.notFound('Module image');

    await prisma.moduleImageAsset.delete({ where: { id: imageId } });
    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete module image:', error);
    return ApiErrors.internal('Failed to delete module image');
  }
}
