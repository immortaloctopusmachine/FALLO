import { describe, expect, it } from 'vitest';
import { computeStreakState } from '@/lib/rewards/weekly-badges';

describe('weekly badge streak computation', () => {
  it('increments across consecutive qualifying weeks', () => {
    const streak = computeStreakState([
      { weekStartDate: new Date('2026-01-05T00:00:00.000Z'), status: 'qualifies' },
      { weekStartDate: new Date('2026-01-12T00:00:00.000Z'), status: 'qualifies' },
      { weekStartDate: new Date('2026-01-19T00:00:00.000Z'), status: 'qualifies' },
    ]);

    expect(streak).toMatchObject({
      currentCount: 3,
      longestCount: 3,
      isActive: true,
    });
  });

  it('resets on a failing week', () => {
    const streak = computeStreakState([
      { weekStartDate: new Date('2026-01-05T00:00:00.000Z'), status: 'qualifies' },
      { weekStartDate: new Date('2026-01-12T00:00:00.000Z'), status: 'qualifies' },
      { weekStartDate: new Date('2026-01-19T00:00:00.000Z'), status: 'fails' },
      { weekStartDate: new Date('2026-01-26T00:00:00.000Z'), status: 'qualifies' },
    ]);

    expect(streak).toMatchObject({
      currentCount: 1,
      longestCount: 2,
      isActive: true,
    });
  });

  it('allows neutral weeks to pause reviewer streaks without resetting', () => {
    const streak = computeStreakState([
      { weekStartDate: new Date('2026-01-05T00:00:00.000Z'), status: 'qualifies' },
      { weekStartDate: new Date('2026-01-12T00:00:00.000Z'), status: 'qualifies' },
      { weekStartDate: new Date('2026-01-19T00:00:00.000Z'), status: 'neutral' },
      { weekStartDate: new Date('2026-01-26T00:00:00.000Z'), status: 'qualifies' },
    ]);

    expect(streak).toMatchObject({
      currentCount: 3,
      longestCount: 3,
      isActive: true,
    });
  });
});
