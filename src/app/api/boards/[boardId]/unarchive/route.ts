import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import {
  clearBoardArchivedOnlyAt,
  clearProjectArchivedAt,
  parseProjectArchivedAt,
} from '@/lib/project-archive';

// POST /api/boards/[boardId]/unarchive - Restore an archived board
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

    const { response: adminResponse } = await requireBoardAdmin(boardId, session.user.id);
    if (adminResponse) return adminResponse;

    // Check if the board exists and is archived
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        archivedAt: true,
        settings: true,
      },
    });

    if (!board) {
      return ApiErrors.notFound('Board');
    }

    if (scope === 'project') {
      const isProjectArchived = Boolean(parseProjectArchivedAt(board.settings));
      if (!isProjectArchived && !board.archivedAt) {
        return ApiErrors.validation('Project is not archived');
      }

      const updatedBoard = await prisma.board.update({
        where: { id: boardId },
        data: {
          archivedAt: null,
          settings: clearProjectArchivedAt(board.settings),
        },
      });

      return apiSuccess(updatedBoard);
    }

    if (!board.archivedAt) {
      return ApiErrors.validation('Board is not archived');
    }

    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: {
        archivedAt: null,
        settings: clearBoardArchivedOnlyAt(board.settings),
      },
    });

    return apiSuccess(updatedBoard);
  } catch (error) {
    console.error('Failed to unarchive board:', error);
    return ApiErrors.internal('Failed to unarchive board');
  }
}
