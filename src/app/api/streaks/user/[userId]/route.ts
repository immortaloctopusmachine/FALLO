import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { getLoginStreakSummary } from '@/lib/rewards/login-tracking';
import { listSerializedActiveStreaks } from '@/lib/rewards/streaks';

// GET /api/streaks/user/[userId]
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

    const [loginStreak, activeStreaks] = await Promise.all([
      getLoginStreakSummary(prisma, userId),
      listSerializedActiveStreaks(prisma, userId),
    ]);

    return apiSuccess({
      loginStreak: {
        currentStreak: loginStreak.currentStreak,
        longestStreak: loginStreak.longestStreak,
        totalLoginDays: loginStreak.totalLoginDays,
        lastLoginDate: loginStreak.lastLoginDate?.toISOString().slice(0, 10) ?? null,
        weekendsCounted: loginStreak.weekendsCounted,
      },
      activeStreaks,
    });
  } catch (error) {
    console.error('Failed to fetch user streak summary:', error);
    return ApiErrors.internal('Failed to fetch user streak summary');
  }
}
