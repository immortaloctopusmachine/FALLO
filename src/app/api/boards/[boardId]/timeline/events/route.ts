import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId]/timeline/events - Get all events for a board
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const events = await prisma.timelineEvent.findMany({
      where: { boardId },
      include: {
        eventType: true,
      },
      orderBy: { startDate: 'asc' },
    });

    return apiSuccess(events);
  } catch (error) {
    console.error('Failed to fetch timeline events:', error);
    return ApiErrors.internal('Failed to fetch timeline events');
  }
}

// POST /api/boards/[boardId]/timeline/events - Create a new timeline event
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    // Check if user is admin
    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const { title, description, eventTypeId, startDate, endDate } = body;

    // Validate required fields
    if (!title || !eventTypeId || !startDate) {
      return ApiErrors.validation('title, eventTypeId, and startDate are required');
    }

    // Validate event type exists
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
    });

    if (!eventType) {
      return ApiErrors.notFound('Event type');
    }

    // For single-day events, endDate equals startDate
    const eventEndDate = endDate ? new Date(endDate) : new Date(startDate);

    const event = await prisma.timelineEvent.create({
      data: {
        boardId,
        title: title.trim(),
        description: description?.trim() || null,
        eventTypeId,
        startDate: new Date(startDate),
        endDate: eventEndDate,
      },
      include: {
        eventType: true,
      },
    });

    return apiSuccess(event, 201);
  } catch (error) {
    console.error('Failed to create timeline event:', error);
    return ApiErrors.internal('Failed to create timeline event');
  }
}
