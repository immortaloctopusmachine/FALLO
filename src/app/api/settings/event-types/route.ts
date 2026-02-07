import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/settings/event-types - Get all event types
export async function GET() {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const eventTypes = await prisma.eventType.findMany({
      where: {
        studioId: null, // Global event types only for now
      },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { events: true },
        },
      },
    });

    return apiSuccess(eventTypes);
  } catch (error) {
    console.error('Failed to fetch event types:', error);
    return ApiErrors.internal('Failed to fetch event types');
  }
}

// POST /api/settings/event-types - Create a new event type
export async function POST(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const { name, description, color, icon } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrors.validation('Event type name is required');
    }

    if (!color || typeof color !== 'string') {
      return ApiErrors.validation('Event type color is required');
    }

    // Get the highest position
    const maxPosition = await prisma.eventType.aggregate({
      where: { studioId: null },
      _max: { position: true },
    });

    const eventType = await prisma.eventType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color,
        icon: icon || null,
        position: (maxPosition._max.position ?? -1) + 1,
        isDefault: false,
        studioId: null,
      },
    });

    return apiSuccess(eventType, 201);
  } catch (error) {
    console.error('Failed to create event type:', error);
    return ApiErrors.internal('Failed to create event type');
  }
}
