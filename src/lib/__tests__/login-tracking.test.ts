import { describe, expect, it } from 'vitest';
import {
  computeNextLoginStreakState,
  isWeekendUtc,
  toUtcDateOnly,
} from '@/lib/rewards/login-tracking';

describe('login tracking', () => {
  it('normalizes dates to UTC day precision', () => {
    const normalized = toUtcDateOnly(new Date('2026-02-28T17:42:11.000Z'));

    expect(normalized.toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });

  it('detects weekend dates in UTC', () => {
    expect(isWeekendUtc(new Date('2026-02-28T10:00:00.000Z'))).toBe(true);
    expect(isWeekendUtc(new Date('2026-03-02T10:00:00.000Z'))).toBe(false);
  });

  it('starts a new streak on first login', () => {
    const result = computeNextLoginStreakState({
      currentDate: new Date('2026-03-03T08:00:00.000Z'),
      lastLoginDate: null,
      currentStreak: 0,
      longestStreak: 0,
      totalLoginDays: 0,
      weekendsCounted: false,
    });

    expect(result).toMatchObject({
      currentStreak: 1,
      longestStreak: 1,
      totalLoginDays: 1,
      weekendsCounted: false,
    });
  });

  it('increments on consecutive days', () => {
    const result = computeNextLoginStreakState({
      currentDate: new Date('2026-03-03T08:00:00.000Z'),
      lastLoginDate: new Date('2026-03-02T08:00:00.000Z'),
      currentStreak: 4,
      longestStreak: 4,
      totalLoginDays: 10,
      weekendsCounted: false,
    });

    expect(result).toMatchObject({
      currentStreak: 5,
      longestStreak: 5,
      totalLoginDays: 11,
      weekendsCounted: false,
    });
  });

  it('resets after a gap in calendar days', () => {
    const result = computeNextLoginStreakState({
      currentDate: new Date('2026-03-02T08:00:00.000Z'),
      lastLoginDate: new Date('2026-02-27T08:00:00.000Z'),
      currentStreak: 3,
      longestStreak: 3,
      totalLoginDays: 8,
      weekendsCounted: false,
    });

    expect(result).toMatchObject({
      currentStreak: 1,
      longestStreak: 3,
      totalLoginDays: 9,
      weekendsCounted: false,
    });
  });

  it('still flags that a weekend login happened', () => {
    const result = computeNextLoginStreakState({
      currentDate: new Date('2026-02-28T08:00:00.000Z'),
      lastLoginDate: new Date('2026-02-27T08:00:00.000Z'),
      currentStreak: 3,
      longestStreak: 3,
      totalLoginDays: 8,
      weekendsCounted: false,
    });

    expect(result).toMatchObject({
      currentStreak: 4,
      longestStreak: 4,
      totalLoginDays: 9,
      weekendsCounted: true,
    });
  });

  it('resets after a gap even if weekends have been counted before', () => {
    const result = computeNextLoginStreakState({
      currentDate: new Date('2026-03-02T08:00:00.000Z'),
      lastLoginDate: new Date('2026-02-27T08:00:00.000Z'),
      currentStreak: 6,
      longestStreak: 6,
      totalLoginDays: 20,
      weekendsCounted: true,
    });

    expect(result).toMatchObject({
      currentStreak: 1,
      longestStreak: 6,
      totalLoginDays: 21,
      weekendsCounted: true,
    });
  });
});
