import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// POST /api/boards/[boardId]/unarchive - Restore an archived board
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    const { response: adminResponse } = await requireBoardAdmin(boardId, session.user.id);
    if (adminResponse) return adminResponse;

    // Check if the board exists and is archived
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { archivedAt: true },
    });

    if (!board) {
      return ApiErrors.notFound('Board');
    }

    if (!board.archivedAt) {
      return ApiErrors.validation('Board is not archived');
    }

    // Unarchive the board
    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: { archivedAt: null },
    });

    return apiSuccess(updatedBoard);
  } catch (error) {
    console.error('Failed to unarchive board:', error);
    return ApiErrors.internal('Failed to unarchive board');
  }
}
