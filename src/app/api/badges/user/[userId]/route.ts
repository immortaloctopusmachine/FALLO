import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { getUserBadgeCollection } from '@/lib/rewards/badges';

// GET /api/badges/user/[userId]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const { userId } = await params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return ApiErrors.notFound('User');
    }

    const collection = await getUserBadgeCollection(prisma, userId);
    return apiSuccess(collection);
  } catch (error) {
    console.error('Failed to fetch user badge collection:', error);
    return ApiErrors.internal('Failed to fetch user badge collection');
  }
}
