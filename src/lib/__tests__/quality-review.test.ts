import { describe, expect, it } from 'vitest';
import type { EvaluatorRole } from '@prisma/client';
import {
  aggregateDimensionScores,
  calculatePairwiseDivergence,
  computeOverallAverage,
  confidenceFromSampleSize,
  qualityTierFromAverage,
  resolveEvaluatorRolesFromRoleNames,
} from '../quality-review';

function toAggregateMap(
  aggregates: ReturnType<typeof aggregateDimensionScores>
): Map<string, (typeof aggregates)[number]> {
  return new Map(aggregates.map((aggregate) => [aggregate.dimensionId, aggregate]));
}

describe('quality-review helpers', () => {
  it('computes confidence thresholds from sample size', () => {
    expect(confidenceFromSampleSize(0)).toBe('RED');
    expect(confidenceFromSampleSize(4)).toBe('RED');
    expect(confidenceFromSampleSize(5)).toBe('AMBER');
    expect(confidenceFromSampleSize(19)).toBe('AMBER');
    expect(confidenceFromSampleSize(20)).toBe('GREEN');
  });

  it('aggregates numeric scores per dimension and excludes NOT_APPLICABLE', () => {
    const aggregates = aggregateDimensionScores([
      { dimensionId: 'tech', score: 'HIGH' },
      { dimensionId: 'tech', score: 'LOW' },
      { dimensionId: 'tech', score: 'NOT_APPLICABLE' },
      { dimensionId: 'delivery', score: 'MEDIUM' },
      { dimensionId: 'delivery', score: 'NOT_APPLICABLE' },
    ]);

    const byDimension = toAggregateMap(aggregates);
    expect(byDimension.get('tech')).toEqual({
      dimensionId: 'tech',
      average: 2,
      count: 2,
      confidence: 'RED',
    });
    expect(byDimension.get('delivery')).toEqual({
      dimensionId: 'delivery',
      average: 2,
      count: 1,
      confidence: 'RED',
    });
  });

  it('computes overall average from non-null dimension averages', () => {
    expect(
      computeOverallAverage([
        { average: 2.5 },
        { average: null },
        { average: 1.5 },
      ])
    ).toBe(2);

    expect(computeOverallAverage([{ average: null }])).toBeNull();
  });

  it('maps overall average to quality tier boundaries', () => {
    expect(qualityTierFromAverage(null)).toBe('UNSCORED');
    expect(qualityTierFromAverage(2.5)).toBe('HIGH');
    expect(qualityTierFromAverage(2.49)).toBe('MEDIUM');
    expect(qualityTierFromAverage(1.5)).toBe('MEDIUM');
    expect(qualityTierFromAverage(1.49)).toBe('LOW');
  });

  it('resolves evaluator roles from role names using hints', () => {
    const resolved = resolveEvaluatorRolesFromRoleNames([
      'Lead Artist',
      'Product Owner',
      'Head of Art',
      'PO.',
      'Administrator',
      'Leadership coach',
    ]);

    const roleSet = new Set(resolved);
    expect(roleSet).toEqual(
      new Set<EvaluatorRole>(['LEAD', 'PO', 'HEAD_OF_ART'])
    );
  });

  it('flags pairwise divergence only when shared role averages exceed threshold', () => {
    const flags = calculatePairwiseDivergence([
      { dimensionId: 'tech', role: 'LEAD', average: 3, count: 1 },
      { dimensionId: 'tech', role: 'PO', average: 1, count: 2 },
      { dimensionId: 'tech', role: 'HEAD_OF_ART', average: 1, count: 1 },
      { dimensionId: 'delivery', role: 'LEAD', average: 2, count: 1 },
      { dimensionId: 'delivery', role: 'PO', average: 1.2, count: 1 },
      { dimensionId: 'context', role: 'PO', average: null, count: 0 },
    ]);

    expect(flags).toEqual([
      {
        dimensionId: 'tech',
        roleA: 'LEAD',
        roleB: 'PO',
        averageA: 3,
        averageB: 1,
        difference: 2,
      },
      {
        dimensionId: 'tech',
        roleA: 'LEAD',
        roleB: 'HEAD_OF_ART',
        averageA: 3,
        averageB: 1,
        difference: 2,
      },
    ]);
  });
});
