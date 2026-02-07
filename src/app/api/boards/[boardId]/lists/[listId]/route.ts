import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  requireBoardAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// PATCH /api/boards/[boardId]/lists/[listId] - Update list
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string; listId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, listId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const body = await request.json();
    const { name, position, color, phase, durationWeeks, durationDays, startDate, endDate } = body;

    // Validate phase if provided
    const validPhases = ['BACKLOG', 'SPINE_PROTOTYPE', 'CONCEPT', 'PRODUCTION', 'TWEAK', 'DONE'];
    const listPhase = phase !== undefined
      ? (phase && validPhases.includes(phase) ? phase : null)
      : undefined;

    const list = await prisma.list.update({
      where: { id: listId, boardId },
      data: {
        ...(name && { name: name.trim() }),
        ...(position !== undefined && { position }),
        ...(color !== undefined && { color: color || null }),
        ...(listPhase !== undefined && { phase: listPhase }),
        ...(durationWeeks !== undefined && { durationWeeks: durationWeeks || null }),
        ...(durationDays !== undefined && { durationDays: durationDays || null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    });

    return apiSuccess(list);
  } catch (error) {
    console.error('Failed to update list:', error);
    return ApiErrors.internal('Failed to update list');
  }
}

// DELETE /api/boards/[boardId]/lists/[listId] - Delete list
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; listId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, listId } = await params;

    const { response: adminResponse } = await requireBoardAdmin(boardId, session.user.id);
    if (adminResponse) return adminResponse;

    await prisma.list.delete({
      where: { id: listId, boardId },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete list:', error);
    return ApiErrors.internal('Failed to delete list');
  }
}
