import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// PATCH /api/boards/[boardId]/cards/[cardId]/comments/[commentId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string; commentId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { commentId } = await params;
    const body = await request.json();
    const { content } = body;

    // Check ownership
    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existing || existing.authorId !== session.user.id) {
      return ApiErrors.forbidden('Cannot edit this comment');
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
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
    });

    return apiSuccess(comment);
  } catch (error) {
    console.error('Failed to update comment:', error);
    return ApiErrors.internal('Failed to update comment');
  }
}

// DELETE /api/boards/[boardId]/cards/[cardId]/comments/[commentId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string; commentId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { commentId } = await params;

    // Check ownership
    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existing || existing.authorId !== session.user.id) {
      return ApiErrors.forbidden('Cannot delete this comment');
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return ApiErrors.internal('Failed to delete comment');
  }
}
