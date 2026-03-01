import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { getUserBadgeCollection } from '@/lib/rewards/badges';

// GET /api/badges/my
export async function GET() {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const collection = await getUserBadgeCollection(prisma, session.user.id);
    return apiSuccess(collection);
  } catch (error) {
    console.error('Failed to fetch current user badge collection:', error);
    return ApiErrors.internal('Failed to fetch current user badge collection');
  }
}
