import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId]/spine-tracker/tasks
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { boardId } = await params;

    const membershipResult = await requireBoardMember(boardId, session.user.id);
    if (membershipResult.response) return membershipResult.response;

    const cards = await prisma.card.findMany({
      where: {
        type: 'TASK',
        archivedAt: null,
        list: {
          boardId,
          viewType: {
            in: ['TASKS', 'PLANNING'],
          },
        },
      },
      select: {
        id: true,
        title: true,
        list: {
          select: {
            name: true,
            viewType: true,
          },
        },
      },
    });

    const taskOptions = cards
      .map((card) => ({
        id: card.id,
        title: card.title,
        listName: card.list.name,
      }))
      .sort((a, b) => {
        const byTitle = a.title.localeCompare(b.title);
        if (byTitle !== 0) return byTitle;
        return a.listName.localeCompare(b.listName);
      });

    return apiSuccess(taskOptions);
  } catch (error) {
    console.error('Failed to fetch spine tracker tasks:', error);
    return ApiErrors.internal('Failed to fetch spine tracker tasks');
  }
}
