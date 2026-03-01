import type { Prisma, PrismaClient } from '@prisma/client';

type RewardsDbClient = PrismaClient | Prisma.TransactionClient;

export interface LoginStreakSummary {
  currentStreak: number;
  longestStreak: number;
  totalLoginDays: number;
  lastLoginDate: Date | null;
  weekendsCounted: boolean;
}

export interface RecordDailyLoginResult {
  alreadyRecorded: boolean;
  date: Date;
  streak: LoginStreakSummary;
}

function toUtcDayNumber(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000;
}

export function toUtcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isWeekendUtc(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function isTrackedConsecutiveDay(
  lastLoginDate: Date,
  currentDate: Date
): boolean {
  const dayDiff = toUtcDayNumber(currentDate) - toUtcDayNumber(lastLoginDate);
  if (dayDiff <= 0) return false;
  return dayDiff === 1;
}

export function computeNextLoginStreakState(params: {
  currentDate: Date;
  lastLoginDate: Date | null;
  currentStreak: number;
  longestStreak: number;
  totalLoginDays: number;
  weekendsCounted: boolean;
}): LoginStreakSummary {
  const currentDate = toUtcDateOnly(params.currentDate);
  const lastLoginDate = params.lastLoginDate ? toUtcDateOnly(params.lastLoginDate) : null;
  const nextWeekendsCounted = params.weekendsCounted || isWeekendUtc(currentDate);

  if (!lastLoginDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, params.longestStreak),
      totalLoginDays: params.totalLoginDays + 1,
      lastLoginDate: currentDate,
      weekendsCounted: nextWeekendsCounted,
    };
  }

  const dayDiff = toUtcDayNumber(currentDate) - toUtcDayNumber(lastLoginDate);
  if (dayDiff <= 0) {
    return {
      currentStreak: params.currentStreak,
      longestStreak: params.longestStreak,
      totalLoginDays: params.totalLoginDays,
      lastLoginDate,
      weekendsCounted: nextWeekendsCounted,
    };
  }

  const nextCurrentStreak = isTrackedConsecutiveDay(
    lastLoginDate,
    currentDate
  )
    ? params.currentStreak + 1
    : 1;

  return {
    currentStreak: nextCurrentStreak,
    longestStreak: Math.max(params.longestStreak, nextCurrentStreak),
    totalLoginDays: params.totalLoginDays + 1,
    lastLoginDate: currentDate,
    weekendsCounted: nextWeekendsCounted,
  };
}

function toLoginStreakSummary(
  streak:
    | {
        currentStreak: number;
        longestStreak: number;
        totalLoginDays: number;
        lastLoginDate: Date | null;
        weekendsCounted: boolean;
      }
    | null
): LoginStreakSummary {
  if (!streak) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalLoginDays: 0,
      lastLoginDate: null,
      weekendsCounted: false,
    };
  }

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalLoginDays: streak.totalLoginDays,
    lastLoginDate: streak.lastLoginDate,
    weekendsCounted: streak.weekendsCounted,
  };
}

export async function getLoginStreakSummary(
  db: RewardsDbClient,
  userId: string
): Promise<LoginStreakSummary> {
  const streak = await db.loginStreak.findUnique({
    where: { userId },
    select: {
      currentStreak: true,
      longestStreak: true,
      totalLoginDays: true,
      lastLoginDate: true,
      weekendsCounted: true,
    },
  });

  return toLoginStreakSummary(streak);
}

export async function recordDailyLogin(
  db: PrismaClient,
  userId: string,
  now: Date = new Date()
): Promise<RecordDailyLoginResult> {
  const date = toUtcDateOnly(now);

  return db.$transaction(async (tx) => {
    const existingRecord = await tx.dailyLoginRecord.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      select: { id: true },
    });

    const existingStreak = await tx.loginStreak.findUnique({
      where: { userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        totalLoginDays: true,
        lastLoginDate: true,
        weekendsCounted: true,
      },
    });

    if (existingRecord) {
      return {
        alreadyRecorded: true,
        date,
        streak: toLoginStreakSummary(existingStreak),
      };
    }

    await tx.dailyLoginRecord.create({
      data: {
        userId,
        date,
      },
    });

    const nextState = computeNextLoginStreakState({
      currentDate: date,
      lastLoginDate: existingStreak?.lastLoginDate ?? null,
      currentStreak: existingStreak?.currentStreak ?? 0,
      longestStreak: existingStreak?.longestStreak ?? 0,
      totalLoginDays: existingStreak?.totalLoginDays ?? 0,
      weekendsCounted: existingStreak?.weekendsCounted ?? false,
    });

    const updatedStreak = await tx.loginStreak.upsert({
      where: { userId },
      update: nextState,
      create: {
        userId,
        ...nextState,
      },
      select: {
        currentStreak: true,
        longestStreak: true,
        totalLoginDays: true,
        lastLoginDate: true,
        weekendsCounted: true,
      },
    });

    return {
      alreadyRecorded: false,
      date,
      streak: toLoginStreakSummary(updatedStreak),
    };
  });
}
