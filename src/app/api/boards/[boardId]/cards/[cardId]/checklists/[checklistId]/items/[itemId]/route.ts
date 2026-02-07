import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// PATCH /api/boards/[boardId]/cards/[cardId]/checklists/[checklistId]/items/[itemId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string; checklistId: string; itemId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, itemId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const body = await request.json();
    const { content, isComplete, position } = body;

    const updates: Record<string, unknown> = {};
    if (content !== undefined) updates.content = content.trim();
    if (isComplete !== undefined) updates.isComplete = isComplete;
    if (position !== undefined) updates.position = position;

    const item = await prisma.checklistItem.update({
      where: { id: itemId },
      data: updates,
    });

    return apiSuccess(item);
  } catch (error) {
    console.error('Failed to update checklist item:', error);
    return ApiErrors.internal('Failed to update checklist item');
  }
}

// DELETE /api/boards/[boardId]/cards/[cardId]/checklists/[checklistId]/items/[itemId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string; checklistId: string; itemId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, itemId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    await prisma.checklistItem.delete({
      where: { id: itemId },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete checklist item:', error);
    return ApiErrors.internal('Failed to delete checklist item');
  }
}
