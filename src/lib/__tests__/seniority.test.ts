import { describe, expect, it } from 'vitest';
import { parseSeniorityConfigPatch, sortBySeniority } from '@/lib/rewards/seniority';

describe('seniority rewards config helpers', () => {
  it('sorts configs in junior-mid-senior order', () => {
    const sorted = sortBySeniority([
      { seniority: 'SENIOR' as const, value: 3 },
      { seniority: 'JUNIOR' as const, value: 1 },
      { seniority: 'MID' as const, value: 2 },
    ]);

    expect(sorted.map((item) => item.seniority)).toEqual(['JUNIOR', 'MID', 'SENIOR']);
  });

  it('parses a partial numeric patch', () => {
    const patch = parseSeniorityConfigPatch({
      expectedPointsPerWeek: 18,
      expectedQualityAvg: 2.2,
    });

    expect(patch).toMatchObject({
      expectedPointsPerWeek: 18,
      expectedQualityAvg: 2.2,
    });
  });

  it('rejects invalid config values', () => {
    expect(() =>
      parseSeniorityConfigPatch({
        expectedPointsPerWeek: -1,
      })
    ).toThrow('expected points per week must be a non-negative number');
  });
});
