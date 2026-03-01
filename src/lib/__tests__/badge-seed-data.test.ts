import { describe, expect, it } from 'vitest';
import {
  MVP_BADGE_DEFINITIONS,
  VELOCITY_STREAK_BADGE_DEFINITIONS,
  getTriggeredLoginBadgeDefinitions,
} from '@/lib/rewards/badge-seed-data';

describe('badge seed data', () => {
  it('generates the full velocity streak matrix', () => {
    expect(VELOCITY_STREAK_BADGE_DEFINITIONS).toHaveLength(36);
  });

  it('keeps seeded badge slugs unique', () => {
    const slugs = MVP_BADGE_DEFINITIONS.map((definition) => definition.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('triggers both streak and lifetime login badges when both milestones are hit', () => {
    const definitions = getTriggeredLoginBadgeDefinitions({
      currentStreak: 7,
      totalLoginDays: 10,
    });

    expect(definitions.map((definition) => definition.slug).sort()).toEqual([
      'login-milestone-getting-started',
      'login-streak-first-week',
    ]);
  });

  it('triggers the first-timer badge on the first login', () => {
    const definitions = getTriggeredLoginBadgeDefinitions({
      currentStreak: 1,
      totalLoginDays: 1,
    });

    expect(definitions.map((definition) => definition.slug)).toEqual([
      'login-milestone-first-timer',
    ]);
  });
});
