import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// POST /api/boards/[boardId]/cards/[cardId]/checklists/[checklistId]/items
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string; checklistId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, checklistId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return ApiErrors.validation('Item content is required');
    }

    // Get highest position
    const lastItem = await prisma.checklistItem.findFirst({
      where: { checklistId },
      orderBy: { position: 'desc' },
    });

    const item = await prisma.checklistItem.create({
      data: {
        content: content.trim(),
        position: (lastItem?.position ?? -1) + 1,
        checklistId,
      },
    });

    return apiSuccess(item);
  } catch (error) {
    console.error('Failed to create checklist item:', error);
    return ApiErrors.internal('Failed to create checklist item');
  }
}
