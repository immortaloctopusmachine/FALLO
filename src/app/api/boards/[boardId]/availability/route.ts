import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import { getMonday } from '@/lib/date-utils';

// GET /api/boards/[boardId]/availability - Get weekly availability for a board
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

    // Parse date range from query params
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const whereClause: { boardId: string; weekStart?: { gte?: Date; lte?: Date } } = { boardId };

    if (startDateParam || endDateParam) {
      whereClause.weekStart = {};
      if (startDateParam) {
        whereClause.weekStart.gte = getMonday(new Date(startDateParam));
      }
      if (endDateParam) {
        whereClause.weekStart.lte = getMonday(new Date(endDateParam));
      }
    }

    const availability = await prisma.userWeeklyAvailability.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [{ weekStart: 'asc' }, { userId: 'asc' }],
    });

    // Transform to match frontend type
    const transformed = availability.map((a) => ({
      id: a.id,
      dedication: a.dedication,
      weekStart: a.weekStart.toISOString(),
      userId: a.userId,
      boardId: a.boardId,
      user: a.user,
    }));

    return apiSuccess(transformed);
  } catch (error) {
    console.error('Failed to fetch weekly availability:', error);
    return ApiErrors.internal('Failed to fetch weekly availability');
  }
}

// PUT /api/boards/[boardId]/availability - Set availability for a user/week (upsert)
export async function PUT(
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

    // Verify board exists
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      return ApiErrors.notFound('Board');
    }

    const body = await request.json();
    const { userId, weekStart, dedication } = body;

    // Validate required fields
    if (!userId) {
      return ApiErrors.validation('userId is required');
    }
    if (!weekStart) {
      return ApiErrors.validation('weekStart is required');
    }
    if (dedication === undefined || dedication === null) {
      return ApiErrors.validation('dedication is required');
    }

    // Validate dedication is valid (0, 25, 33, 50, 75, or 100)
    const validDedications = [0, 25, 33, 50, 75, 100];
    if (!validDedications.includes(dedication)) {
      return ApiErrors.validation('dedication must be 0, 25, 33, 50, 75, or 100');
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return ApiErrors.notFound('User');
    }

    // Normalize weekStart to Monday
    const normalizedWeekStart = getMonday(new Date(weekStart));

    // If dedication is 0, delete the record (if exists)
    if (dedication === 0) {
      await prisma.userWeeklyAvailability.deleteMany({
        where: {
          boardId,
          userId,
          weekStart: normalizedWeekStart,
        },
      });

      return apiSuccess({ deleted: true });
    }

    // Upsert the availability
    const availability = await prisma.userWeeklyAvailability.upsert({
      where: {
        boardId_userId_weekStart: {
          boardId,
          userId,
          weekStart: normalizedWeekStart,
        },
      },
      create: {
        boardId,
        userId,
        weekStart: normalizedWeekStart,
        dedication,
      },
      update: {
        dedication,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return apiSuccess({
      id: availability.id,
      dedication: availability.dedication,
      weekStart: availability.weekStart.toISOString(),
      userId: availability.userId,
      boardId: availability.boardId,
      user: availability.user,
    });
  } catch (error) {
    console.error('Failed to set weekly availability:', error);
    return ApiErrors.internal('Failed to set weekly availability');
  }
}

// POST /api/boards/[boardId]/availability - Bulk set availability
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

    // Verify board exists
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      return ApiErrors.notFound('Board');
    }

    const body = await request.json();
    const { entries } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return ApiErrors.validation('entries array is required');
    }

    const validDedications = [0, 25, 33, 50, 75, 100];
    const results = [];

    for (const entry of entries) {
      const { userId, weekStart, dedication } = entry;

      if (!userId || !weekStart || dedication === undefined) {
        continue; // Skip invalid entries
      }

      if (!validDedications.includes(dedication)) {
        continue; // Skip invalid dedication values
      }

      const normalizedWeekStart = getMonday(new Date(weekStart));

      if (dedication === 0) {
        // Delete record if dedication is 0
        await prisma.userWeeklyAvailability.deleteMany({
          where: {
            boardId,
            userId,
            weekStart: normalizedWeekStart,
          },
        });
        results.push({ userId, weekStart: normalizedWeekStart.toISOString(), deleted: true });
      } else {
        // Upsert
        const availability = await prisma.userWeeklyAvailability.upsert({
          where: {
            boardId_userId_weekStart: {
              boardId,
              userId,
              weekStart: normalizedWeekStart,
            },
          },
          create: {
            boardId,
            userId,
            weekStart: normalizedWeekStart,
            dedication,
          },
          update: {
            dedication,
          },
        });
        results.push({
          id: availability.id,
          userId,
          weekStart: normalizedWeekStart.toISOString(),
          dedication,
        });
      }
    }

    return apiSuccess(results);
  } catch (error) {
    console.error('Failed to bulk set availability:', error);
    return ApiErrors.internal('Failed to bulk set availability');
  }
}
