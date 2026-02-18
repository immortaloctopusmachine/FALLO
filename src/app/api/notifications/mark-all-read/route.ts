import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';

// POST /api/notifications/mark-all-read — Mark all notifications as read
export async function POST() {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const result = await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });

    return apiSuccess({ markedRead: result.count });
  } catch (error) {
    console.error('[NOTIFICATIONS_MARK_ALL_READ]', error);
    return ApiErrors.internal('Failed to mark notifications as read');
  }
}
