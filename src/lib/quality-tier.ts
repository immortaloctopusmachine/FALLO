export type QualityTier = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';

export function getQualityTierTextClass(tier: QualityTier): string {
  if (tier === 'HIGH') return 'text-green-600';
  if (tier === 'MEDIUM') return 'text-amber-600';
  if (tier === 'LOW') return 'text-red-600';
  return 'text-text-tertiary';
}
