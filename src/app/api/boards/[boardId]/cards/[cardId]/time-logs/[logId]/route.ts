import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// PATCH /api/boards/[boardId]/cards/[cardId]/time-logs/[logId] - Update a time log (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string; logId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, cardId, logId } = await params;

    // Check if user is admin
    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    // Check if time log exists
    const existingLog = await prisma.timeLog.findFirst({
      where: {
        id: logId,
        cardId,
        card: {
          list: { boardId },
        },
      },
    });

    if (!existingLog) {
      return ApiErrors.notFound('Time log');
    }

    const body = await request.json();
    const { startTime, endTime, durationMs, notes } = body;

    // Calculate duration if times are provided
    let calculatedDuration = durationMs;
    if (calculatedDuration === undefined && startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      calculatedDuration = end.getTime() - start.getTime();
    }

    const updateData: Record<string, unknown> = {};
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (calculatedDuration !== undefined) updateData.durationMs = calculatedDuration;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const timeLog = await prisma.timeLog.update({
      where: { id: logId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        list: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return apiSuccess(timeLog);
  } catch (error) {
    console.error('Failed to update time log:', error);
    return ApiErrors.internal('Failed to update time log');
  }
}

// DELETE /api/boards/[boardId]/cards/[cardId]/time-logs/[logId] - Delete a time log (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; cardId: string; logId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, cardId, logId } = await params;

    // Check if user is admin
    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    // Check if time log exists
    const existingLog = await prisma.timeLog.findFirst({
      where: {
        id: logId,
        cardId,
        card: {
          list: { boardId },
        },
      },
    });

    if (!existingLog) {
      return ApiErrors.notFound('Time log');
    }

    await prisma.timeLog.delete({
      where: { id: logId },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete time log:', error);
    return ApiErrors.internal('Failed to delete time log');
  }
}
