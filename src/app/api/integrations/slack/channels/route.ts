import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { isSlackConfigured, listSlackChannels } from '@/lib/slack';

export async function GET() {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });

    const isAdmin = currentUser?.permission === 'ADMIN' || currentUser?.permission === 'SUPER_ADMIN';
    if (!isAdmin) {
      return ApiErrors.forbidden('Admin access required');
    }

    if (!isSlackConfigured()) {
      return apiSuccess([]);
    }

    const channels = await listSlackChannels();
    return apiSuccess(channels);
  } catch (error) {
    console.error('Failed to fetch Slack channels:', error);
    return ApiErrors.internal('Failed to fetch Slack channels');
  }
}
