import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { getLoginStreakSummary } from '@/lib/rewards/login-tracking';
import { listSerializedActiveStreaks } from '@/lib/rewards/streaks';

// GET /api/streaks/my
export async function GET() {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const [loginStreak, activeStreaks] = await Promise.all([
      getLoginStreakSummary(prisma, session.user.id),
      listSerializedActiveStreaks(prisma, session.user.id),
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
    console.error('Failed to fetch streak summary:', error);
    return ApiErrors.internal('Failed to fetch streak summary');
  }
}
