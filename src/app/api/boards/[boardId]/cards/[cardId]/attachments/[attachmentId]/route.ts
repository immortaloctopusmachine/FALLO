import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import { deleteFileByUrl } from '@/lib/storage';

// PATCH /api/boards/[boardId]/cards/[cardId]/attachments/[attachmentId] - Rename attachment
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string; attachmentId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, attachmentId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrors.validation('Attachment name is required');
    }

    const attachment = await prisma.attachment.update({
      where: { id: attachmentId },
      data: { name: name.trim() },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return apiSuccess(attachment);
  } catch (error) {
    console.error('Failed to rename attachment:', error);
    return ApiErrors.internal('Failed to rename attachment');
  }
}

// DELETE /api/boards/[boardId]/cards/[cardId]/attachments/[attachmentId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string; attachmentId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, attachmentId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    // Get the attachment to find the file URL
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return ApiErrors.notFound('Attachment');
    }

    // Delete from database
    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    // Delete physical file (best-effort, works for both local and R2)
    try {
      await deleteFileByUrl(attachment.url);
    } catch {
      // File might not exist or storage unreachable
    }

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete attachment:', error);
    return ApiErrors.internal('Failed to delete attachment');
  }
}
