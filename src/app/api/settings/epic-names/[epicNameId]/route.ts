import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// PATCH /api/settings/epic-names/[epicNameId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ epicNameId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { epicNameId } = await params;
    const body = await request.json();

    const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
    const description = typeof body?.description === 'string'
      ? body.description.trim()
      : body?.description === null
        ? null
        : undefined;

    const existing = await prisma.epicNamePreset.findUnique({
      where: { id: epicNameId },
      select: { id: true },
    });

    if (!existing) {
      return ApiErrors.notFound('Epic name preset');
    }

    if (name !== undefined && !name) {
      return ApiErrors.validation('Epic name cannot be empty');
    }

    if (name) {
      const duplicate = await prisma.epicNamePreset.findUnique({
        where: { name },
        select: { id: true },
      });
      if (duplicate && duplicate.id !== epicNameId) {
        return ApiErrors.validation('This epic name already exists');
      }
    }

    const updated = await prisma.epicNamePreset.update({
      where: { id: epicNameId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error('Failed to update epic name:', error);
    return ApiErrors.internal('Failed to update epic name');
  }
}

// DELETE /api/settings/epic-names/[epicNameId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ epicNameId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { epicNameId } = await params;

    const existing = await prisma.epicNamePreset.findUnique({
      where: { id: epicNameId },
      select: { id: true },
    });

    if (!existing) {
      return ApiErrors.notFound('Epic name preset');
    }

    await prisma.epicNamePreset.delete({ where: { id: epicNameId } });
    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete epic name:', error);
    return ApiErrors.internal('Failed to delete epic name');
  }
}
