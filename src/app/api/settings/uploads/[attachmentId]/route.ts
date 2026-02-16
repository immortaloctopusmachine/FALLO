import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import { deleteFileByUrl } from '@/lib/storage';

// PATCH /api/settings/uploads/[attachmentId] - Rename uploaded file
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });
    if (user?.permission !== 'SUPER_ADMIN') {
      return ApiErrors.forbidden('Super Admin access required');
    }

    const { attachmentId } = await params;
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return ApiErrors.validation('File name is required');
    }

    const existing = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: { id: true },
    });
    if (!existing) {
      return ApiErrors.notFound('Upload');
    }

    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: { name },
      select: {
        id: true,
        name: true,
        url: true,
        type: true,
        size: true,
        createdAt: true,
        uploaderId: true,
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        card: {
          select: {
            id: true,
            title: true,
            list: {
              select: {
                id: true,
                name: true,
                board: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error('Failed to rename upload:', error);
    return ApiErrors.internal('Failed to rename upload');
  }
}

// DELETE /api/settings/uploads/[attachmentId] - Delete uploaded file
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });
    if (user?.permission !== 'SUPER_ADMIN') {
      return ApiErrors.forbidden('Super Admin access required');
    }

    const { attachmentId } = await params;

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        url: true,
      },
    });
    if (!attachment) {
      return ApiErrors.notFound('Upload');
    }

    await prisma.attachment.delete({
      where: { id: attachment.id },
    });

    // Best-effort storage cleanup.
    try {
      await deleteFileByUrl(attachment.url);
    } catch {
      // Ignore storage cleanup failures after DB delete.
    }

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete upload:', error);
    return ApiErrors.internal('Failed to delete upload');
  }
}
