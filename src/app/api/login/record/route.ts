import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { awardLoginBadges } from '@/lib/rewards/badges';
import { recordDailyLogin } from '@/lib/rewards/login-tracking';

// POST /api/login/record
export async function POST() {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const result = await recordDailyLogin(prisma, session.user.id);
    const awardedBadges = result.alreadyRecorded
      ? []
      : await awardLoginBadges(prisma, session.user.id, result.streak, result.date);

    return apiSuccess({
      alreadyRecorded: result.alreadyRecorded,
      date: result.date.toISOString().slice(0, 10),
      streak: {
        currentStreak: result.streak.currentStreak,
        longestStreak: result.streak.longestStreak,
        totalLoginDays: result.streak.totalLoginDays,
        lastLoginDate: result.streak.lastLoginDate?.toISOString().slice(0, 10) ?? null,
        weekendsCounted: result.streak.weekendsCounted,
      },
      awardedBadges,
    });
  } catch (error) {
    console.error('Failed to record daily login:', error);
    return ApiErrors.internal('Failed to record daily login');
  }
}
