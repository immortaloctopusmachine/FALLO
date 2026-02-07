import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// PATCH /api/settings/event-types/[eventTypeId] - Update an event type
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventTypeId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { eventTypeId } = await params;
    const body = await request.json();
    const { name, description, color, icon, position } = body;

    // Check if event type exists
    const existingEventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
    });

    if (!existingEventType) {
      return ApiErrors.notFound('Event type');
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon || null;
    if (position !== undefined) updateData.position = position;

    const eventType = await prisma.eventType.update({
      where: { id: eventTypeId },
      data: updateData,
    });

    return apiSuccess(eventType);
  } catch (error) {
    console.error('Failed to update event type:', error);
    return ApiErrors.internal('Failed to update event type');
  }
}

// DELETE /api/settings/event-types/[eventTypeId] - Delete an event type
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventTypeId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { eventTypeId } = await params;

    // Check if event type exists
    const existingEventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: {
        _count: { select: { events: true } },
      },
    });

    if (!existingEventType) {
      return ApiErrors.notFound('Event type');
    }

    // Prevent deletion if event type is in use
    if (existingEventType._count.events > 0) {
      return ApiErrors.validation('Cannot delete event type that is in use');
    }

    // Prevent deletion of default event types
    if (existingEventType.isDefault) {
      return ApiErrors.validation('Cannot delete default event types');
    }

    await prisma.eventType.delete({
      where: { id: eventTypeId },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete event type:', error);
    return ApiErrors.internal('Failed to delete event type');
  }
}
