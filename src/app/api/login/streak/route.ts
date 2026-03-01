import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { getLoginStreakSummary } from '@/lib/rewards/login-tracking';

// GET /api/login/streak
export async function GET() {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const streak = await getLoginStreakSummary(prisma, session.user.id);

    return apiSuccess({
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalLoginDays: streak.totalLoginDays,
      lastLoginDate: streak.lastLoginDate?.toISOString().slice(0, 10) ?? null,
      weekendsCounted: streak.weekendsCounted,
    });
  } catch (error) {
    console.error('Failed to fetch login streak:', error);
    return ApiErrors.internal('Failed to fetch login streak');
  }
}
