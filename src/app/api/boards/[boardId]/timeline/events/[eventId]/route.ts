import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId]/timeline/events/[eventId] - Get a single event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string; eventId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, eventId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const event = await prisma.timelineEvent.findFirst({
      where: {
        id: eventId,
        boardId,
      },
      include: {
        eventType: true,
      },
    });

    if (!event) {
      return ApiErrors.notFound('Event');
    }

    return apiSuccess(event);
  } catch (error) {
    console.error('Failed to fetch timeline event:', error);
    return ApiErrors.internal('Failed to fetch timeline event');
  }
}

// PATCH /api/boards/[boardId]/timeline/events/[eventId] - Update an event
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string; eventId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, eventId } = await params;

    // Check if user is admin
    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    // Check if event exists
    const existingEvent = await prisma.timelineEvent.findFirst({
      where: {
        id: eventId,
        boardId,
      },
    });

    if (!existingEvent) {
      return ApiErrors.notFound('Event');
    }

    const body = await request.json();
    const { title, description, eventTypeId, startDate, endDate } = body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (eventTypeId !== undefined) updateData.eventTypeId = eventTypeId;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);

    const event = await prisma.timelineEvent.update({
      where: { id: eventId },
      data: updateData,
      include: {
        eventType: true,
      },
    });

    return apiSuccess(event);
  } catch (error) {
    console.error('Failed to update timeline event:', error);
    return ApiErrors.internal('Failed to update timeline event');
  }
}

// DELETE /api/boards/[boardId]/timeline/events/[eventId] - Delete an event
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; eventId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, eventId } = await params;

    // Check if user is admin
    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    // Check if event exists
    const existingEvent = await prisma.timelineEvent.findFirst({
      where: {
        id: eventId,
        boardId,
      },
    });

    if (!existingEvent) {
      return ApiErrors.notFound('Event');
    }

    await prisma.timelineEvent.delete({
      where: { id: eventId },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete timeline event:', error);
    return ApiErrors.internal('Failed to delete timeline event');
  }
}
