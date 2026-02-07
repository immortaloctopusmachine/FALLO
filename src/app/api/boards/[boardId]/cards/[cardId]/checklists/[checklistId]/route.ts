import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// PATCH /api/boards/[boardId]/cards/[cardId]/checklists/[checklistId]
export async function PATCH(
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
    const { name, position } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (position !== undefined) updates.position = position;

    const checklist = await prisma.checklist.update({
      where: { id: checklistId },
      data: updates,
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return apiSuccess(checklist);
  } catch (error) {
    console.error('Failed to update checklist:', error);
    return ApiErrors.internal('Failed to update checklist');
  }
}

// DELETE /api/boards/[boardId]/cards/[cardId]/checklists/[checklistId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string; checklistId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, checklistId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    await prisma.checklist.delete({
      where: { id: checklistId },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete checklist:', error);
    return ApiErrors.internal('Failed to delete checklist');
  }
}
