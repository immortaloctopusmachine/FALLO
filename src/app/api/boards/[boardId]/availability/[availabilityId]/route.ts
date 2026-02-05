import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// DELETE /api/boards/[boardId]/availability/[availabilityId] - Delete availability entry
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ boardId: string; availabilityId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, availabilityId } = await params;

    // Check if user is admin
    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    // Verify the availability record exists and belongs to this board
    const availability = await prisma.userWeeklyAvailability.findFirst({
      where: {
        id: availabilityId,
        boardId,
      },
    });

    if (!availability) {
      return ApiErrors.notFound('Availability record');
    }

    await prisma.userWeeklyAvailability.delete({
      where: { id: availabilityId },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete availability:', error);
    return ApiErrors.internal('Failed to delete availability');
  }
}

// GET /api/boards/[boardId]/availability/[availabilityId] - Get single availability entry
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string; availabilityId: string }> }
) {
  try {
    const { response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId, availabilityId } = await params;

    const availability = await prisma.userWeeklyAvailability.findFirst({
      where: {
        id: availabilityId,
        boardId,
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

    if (!availability) {
      return ApiErrors.notFound('Availability record');
    }

    return apiSuccess({
      id: availability.id,
      dedication: availability.dedication,
      weekStart: availability.weekStart.toISOString(),
      userId: availability.userId,
      boardId: availability.boardId,
      user: availability.user,
    });
  } catch (error) {
    console.error('Failed to fetch availability:', error);
    return ApiErrors.internal('Failed to fetch availability');
  }
}
