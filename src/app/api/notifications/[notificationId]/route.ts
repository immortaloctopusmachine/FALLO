import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';

// PATCH /api/notifications/[notificationId] — Mark notification as read
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { notificationId } = await params;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== session.user.id) {
      return ApiErrors.notFound('Notification');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error('[NOTIFICATION_PATCH]', error);
    return ApiErrors.internal('Failed to update notification');
  }
}
