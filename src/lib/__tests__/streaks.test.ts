import { describe, expect, it } from 'vitest';
import { describeStreakType, serializeUserStreak } from '@/lib/rewards/streaks';

describe('rewards streak labels', () => {
  it('maps known velocity streak types to display metadata', () => {
    expect(describeStreakType('velocity:in-the-flow')).toEqual({
      label: 'In the Flow',
      description: 'In the Flow velocity streak',
    });
  });

  it('maps known reviewer streaks to display metadata', () => {
    expect(describeStreakType('reviewer:evaluation-rate-90')).toEqual({
      label: 'Always Watching',
      description: 'Weeks with 90%+ review completion',
    });
  });

  it('serializes user streak dates consistently', () => {
    expect(
      serializeUserStreak({
        id: 'streak-1',
        streakType: 'quality:expected',
        currentCount: 4,
        longestCount: 8,
        lastQualifiedWeek: new Date('2026-02-23T00:00:00.000Z'),
        graceUsed: false,
        isActive: true,
      })
    ).toMatchObject({
      label: 'Quality Standard',
      currentCount: 4,
      longestCount: 8,
      lastQualifiedWeek: '2026-02-23',
    });
  });
});
