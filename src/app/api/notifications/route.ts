import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';

// GET /api/notifications — List notifications for current user
export async function GET(request: Request) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);

    const where = {
      userId: session.user.id,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: session.user.id, read: false },
      }),
    ]);

    return apiSuccess({ notifications, unreadCount });
  } catch (error) {
    console.error('[NOTIFICATIONS_GET]', error);
    return ApiErrors.internal('Failed to fetch notifications');
  }
}
