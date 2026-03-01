import type { Prisma, Seniority } from '@prisma/client';

export const SENIORITY_ORDER: Seniority[] = ['JUNIOR', 'MID', 'SENIOR'];

export const DEFAULT_SENIORITY_CONFIGS = [
  {
    seniority: 'JUNIOR' as const,
    expectedPointsPerWeek: 10,
    expectedQualityAvg: 1.5,
    warmUpPoints: 1,
    steadyHandRatio: 0.5,
    inTheFlowRatio: 1.0,
    onARollRatio: 1.5,
    powerhouseRatio: 2.0,
    forceOfNatureRatio: 2.5,
  },
  {
    seniority: 'MID' as const,
    expectedPointsPerWeek: 15,
    expectedQualityAvg: 2.0,
    warmUpPoints: 1,
    steadyHandRatio: 0.5,
    inTheFlowRatio: 1.0,
    onARollRatio: 1.5,
    powerhouseRatio: 2.0,
    forceOfNatureRatio: 2.5,
  },
  {
    seniority: 'SENIOR' as const,
    expectedPointsPerWeek: 20,
    expectedQualityAvg: 2.5,
    warmUpPoints: 1,
    steadyHandRatio: 0.5,
    inTheFlowRatio: 1.0,
    onARollRatio: 1.5,
    powerhouseRatio: 2.0,
    forceOfNatureRatio: 2.5,
  },
] satisfies Array<Prisma.SeniorityConfigCreateInput>;

const SENIORITY_CONFIG_NUMBER_FIELDS = [
  'expectedPointsPerWeek',
  'expectedQualityAvg',
  'warmUpPoints',
  'steadyHandRatio',
  'inTheFlowRatio',
  'onARollRatio',
  'powerhouseRatio',
  'forceOfNatureRatio',
] as const;

type SeniorityConfigNumberField = (typeof SENIORITY_CONFIG_NUMBER_FIELDS)[number];
export type SeniorityConfigPatchData = Partial<Record<SeniorityConfigNumberField, number>>;

function toFieldLabel(field: SeniorityConfigNumberField): string {
  return field.replace(/([A-Z])/g, ' $1').toLowerCase();
}

export function isSeniority(value: unknown): value is Seniority {
  return typeof value === 'string' && SENIORITY_ORDER.includes(value as Seniority);
}

export function sortBySeniority<T extends { seniority: Seniority | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aIndex = a.seniority ? SENIORITY_ORDER.indexOf(a.seniority) : Number.MAX_SAFE_INTEGER;
    const bIndex = b.seniority ? SENIORITY_ORDER.indexOf(b.seniority) : Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

export function parseSeniorityConfigPatch(
  body: Record<string, unknown>
): SeniorityConfigPatchData {
  const updateData: SeniorityConfigPatchData = {};

  for (const field of SENIORITY_CONFIG_NUMBER_FIELDS) {
    const value = body[field];
    if (value === undefined) continue;

    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`${toFieldLabel(field)} must be a non-negative number`);
    }

    updateData[field] = value;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('At least one seniority config field is required');
  }

  return updateData;
}
