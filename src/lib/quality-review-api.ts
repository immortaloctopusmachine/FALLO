import type {
  EvaluatorRole,
  Prisma,
  PrismaClient,
  ReviewScoreValue,
} from '@prisma/client';
import type { PermissionLevel } from '@/lib/api-utils';
import { ApiErrors } from '@/lib/api-utils';
import {
  aggregateDimensionScores,
  calculatePairwiseDivergence,
  computeOverallAverage,
  confidenceFromSampleSize,
  qualityTierFromAverage,
  resolveEvaluatorRolesFromUserCompanyRoles,
  type ConfidenceLevel,
  type QualityTier,
} from '@/lib/quality-review';

type ReviewDbClient = PrismaClient | Prisma.TransactionClient;

export const REVIEW_SCORE_VALUES: ReviewScoreValue[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'NOT_APPLICABLE',
];

export type ReviewQuestionAudience = 'LEAD' | 'PO' | 'BOTH';

export const REVIEW_QUESTION_AUDIENCES: ReviewQuestionAudience[] = [
  'LEAD',
  'PO',
  'BOTH',
];

export const VELOCITY_DEFAULT_MULTIPLIERS: Record<QualityTier, number> = {
  HIGH: 1.0,
  MEDIUM: 0.8,
  LOW: 0.5,
  UNSCORED: 1.0,
};

export const REVIEW_DIMENSION_INCLUDE = {
  dimensionRoles: {
    select: {
      role: true,
    },
  },
} as const;

export type ReviewDimensionWithRelations = Prisma.ReviewDimensionGetPayload<{
  include: typeof REVIEW_DIMENSION_INCLUDE;
}>;

export interface QualityAccessContext {
  userId: string;
  permission: PermissionLevel;
  evaluatorRoles: EvaluatorRole[];
}

export interface CardQualityContext {
  id: string;
  title: string;
  type: string;
  taskData: Prisma.JsonValue | null;
  list: {
    id: string;
    name: string;
    phase: string | null;
    boardId: string;
    viewType: string;
  };
}

export interface CycleAggregateDimensionSummary {
  dimensionId: string;
  name: string;
  description: string | null;
  position: number;
  average: number | null;
  scoreLabel: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  count: number;
  confidence: ConfidenceLevel;
}

export interface CycleAggregateDivergenceFlag {
  dimensionId: string;
  dimensionName: string;
  roleA: EvaluatorRole;
  roleB: EvaluatorRole;
  averageA: number;
  averageB: number;
  difference: number;
}

export interface CycleAggregateSummary {
  cycleId: string;
  cycleNumber: number;
  openedAt: Date;
  closedAt: Date | null;
  isFinal: boolean;
  lockedAt: Date | null;
  evaluationsCount: number;
  dimensions: CycleAggregateDimensionSummary[];
  overallAverage: number | null;
  qualityTier: QualityTier;
  divergenceFlags: CycleAggregateDivergenceFlag[];
}

function scoreLabelFromAverage(
  average: number | null
): 'LOW' | 'MEDIUM' | 'HIGH' | null {
  if (average === null) return null;
  if (average >= 2.5) return 'HIGH';
  if (average >= 1.5) return 'MEDIUM';
  return 'LOW';
}

export function parseReviewQuestionAudience(
  value: unknown
): ReviewQuestionAudience | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toUpperCase();
  if (normalized === 'LEAD' || normalized === 'PO' || normalized === 'BOTH') {
    return normalized;
  }

  return null;
}

export function parseReviewScoreValue(value: unknown): ReviewScoreValue | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toUpperCase();
  if (REVIEW_SCORE_VALUES.includes(normalized as ReviewScoreValue)) {
    return normalized as ReviewScoreValue;
  }

  return null;
}

export function rolesForAudience(audience: ReviewQuestionAudience): EvaluatorRole[] {
  if (audience === 'LEAD') return ['LEAD'];
  if (audience === 'PO') return ['PO'];
  return ['LEAD', 'PO'];
}

export function audienceFromDimensionRoles(roles: EvaluatorRole[]): ReviewQuestionAudience {
  const roleSet = new Set(roles);
  const hasLead = roleSet.has('LEAD');
  const hasPo = roleSet.has('PO');

  if (hasLead && hasPo) return 'BOTH';
  if (hasLead) return 'LEAD';
  if (hasPo) return 'PO';
  return 'BOTH';
}

function isDimensionVisibleForEvaluatorRoles(
  dimension: ReviewDimensionWithRelations,
  evaluatorRoles: EvaluatorRole[]
): boolean {
  if (evaluatorRoles.includes('HEAD_OF_ART')) {
    return true;
  }

  if (dimension.dimensionRoles.length === 0) {
    return true;
  }

  return dimension.dimensionRoles.some((dimensionRole) =>
    evaluatorRoles.includes(dimensionRole.role)
  );
}

export async function getQualityAccessContext(
  db: ReviewDbClient,
  userId: string
): Promise<QualityAccessContext | null> {
  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      permission: true,
      userCompanyRoles: {
        select: {
          companyRole: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    permission: user.permission as PermissionLevel,
    evaluatorRoles: resolveEvaluatorRolesFromUserCompanyRoles(user.userCompanyRoles),
  };
}

export async function requireNonViewerQualityAccess(
  db: ReviewDbClient,
  userId: string
): Promise<
  | { access: QualityAccessContext; response?: never }
  | { access?: never; response: ReturnType<typeof ApiErrors.forbidden> }
> {
  const access = await getQualityAccessContext(db, userId);

  if (!access) {
    return { response: ApiErrors.notFound('User') };
  }

  if (access.permission === 'VIEWER') {
    return {
      response: ApiErrors.forbidden('Viewer users cannot access quality scores'),
    };
  }

  return { access };
}

export function hasQualitySummaryAccess(evaluatorRoles: EvaluatorRole[]): boolean {
  return evaluatorRoles.length > 0;
}

export async function requireQualitySummaryAccess(
  db: ReviewDbClient,
  userId: string
): Promise<
  | { access: QualityAccessContext; response?: never }
  | { access?: never; response: ReturnType<typeof ApiErrors.forbidden> }
> {
  const access = await getQualityAccessContext(db, userId);

  if (!access) {
    return { response: ApiErrors.notFound('User') };
  }

  if (!hasQualitySummaryAccess(access.evaluatorRoles)) {
    return {
      response: ApiErrors.forbidden(
        'Lead, PO, or Head of Art role required to view quality summaries'
      ),
    };
  }

  return { access };
}

export async function requireSuperAdminQualityAccess(
  db: ReviewDbClient,
  userId: string
): Promise<
  | { access: QualityAccessContext; response?: never }
  | { access?: never; response: ReturnType<typeof ApiErrors.forbidden> }
> {
  const access = await getQualityAccessContext(db, userId);

  if (!access) {
    return { response: ApiErrors.notFound('User') };
  }

  if (access.permission !== 'SUPER_ADMIN') {
    return { response: ApiErrors.forbidden('Super Admin access required') };
  }

  return { access };
}

export async function requireEvaluatorAccess(
  db: ReviewDbClient,
  userId: string
): Promise<
  | { access: QualityAccessContext; response?: never }
  | { access?: never; response: ReturnType<typeof ApiErrors.forbidden> }
> {
  const access = await getQualityAccessContext(db, userId);

  if (!access) {
    return { response: ApiErrors.notFound('User') };
  }

  if (access.evaluatorRoles.length === 0) {
    return {
      response: ApiErrors.forbidden(
        'Lead, PO, or Head of Art role required to submit evaluations'
      ),
    };
  }

  return { access };
}

export async function getApplicableReviewDimensionsForCard(
  db: ReviewDbClient,
  _card: CardQualityContext,
  evaluatorRoles?: EvaluatorRole[],
  preloadedDimensions?: ReviewDimensionWithRelations[]
): Promise<ReviewDimensionWithRelations[]> {
  const dimensions = preloadedDimensions
    ? await Promise.resolve(preloadedDimensions)
    : await db.reviewDimension.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          position: 'asc',
        },
        include: REVIEW_DIMENSION_INCLUDE,
      });

  if (!evaluatorRoles || evaluatorRoles.length === 0) {
    return dimensions;
  }

  return dimensions.filter((dimension) =>
    isDimensionVisibleForEvaluatorRoles(dimension, evaluatorRoles)
  );
}

export async function getReviewerRolesByUserIds(
  db: ReviewDbClient,
  userIds: string[]
): Promise<Map<string, EvaluatorRole[]>> {
  const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean);
  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const rows = await db.userCompanyRole.findMany({
    where: {
      userId: {
        in: uniqueUserIds,
      },
    },
    select: {
      userId: true,
      companyRole: {
        select: {
          name: true,
        },
      },
    },
  });

  const grouped = new Map<string, Array<{ companyRole: { name: string } }>>();

  for (const row of rows) {
    const current = grouped.get(row.userId) ?? [];
    current.push({ companyRole: row.companyRole });
    grouped.set(row.userId, current);
  }

  const result = new Map<string, EvaluatorRole[]>();
  for (const userId of uniqueUserIds) {
    const roleRows = grouped.get(userId) ?? [];
    result.set(userId, resolveEvaluatorRolesFromUserCompanyRoles(roleRows));
  }

  return result;
}

export function buildCycleAggregateSummary(params: {
  cycle: {
    id: string;
    cycleNumber: number;
    openedAt: Date;
    closedAt: Date | null;
    isFinal: boolean;
    lockedAt: Date | null;
    evaluations: Array<{
      reviewerId: string;
      scores: Array<{
        dimensionId: string;
        score: ReviewScoreValue;
      }>;
    }>;
  };
  dimensions: ReviewDimensionWithRelations[];
  reviewerRolesByUserId?: Map<string, EvaluatorRole[]>;
  divergenceThreshold?: number;
}): CycleAggregateSummary {
  const allScores = params.cycle.evaluations.flatMap((evaluation) =>
    evaluation.scores.map((score) => ({
      dimensionId: score.dimensionId,
      score: score.score,
    }))
  );

  const aggregateByDimensionId = new Map(
    aggregateDimensionScores(allScores).map((aggregate) => [aggregate.dimensionId, aggregate])
  );

  const dimensions = params.dimensions
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((dimension): CycleAggregateDimensionSummary => {
      const aggregate = aggregateByDimensionId.get(dimension.id);
      const count = aggregate?.count ?? 0;
      const average = aggregate?.average ?? null;

      return {
        dimensionId: dimension.id,
        name: dimension.name,
        description: dimension.description,
        position: dimension.position,
        average,
        scoreLabel: scoreLabelFromAverage(average),
        count,
        confidence: confidenceFromSampleSize(count),
      };
    });

  const overallAverage = computeOverallAverage(dimensions);
  const qualityTier = qualityTierFromAverage(overallAverage);

  const roleDimensionBuckets = new Map<string, { sum: number; count: number }>();

  for (const evaluation of params.cycle.evaluations) {
    const reviewerRoles = params.reviewerRolesByUserId?.get(evaluation.reviewerId) ?? [];

    for (const scoreEntry of evaluation.scores) {
      const numericScore =
        scoreEntry.score === 'LOW'
          ? 1
          : scoreEntry.score === 'MEDIUM'
            ? 2
            : scoreEntry.score === 'HIGH'
              ? 3
              : null;

      if (numericScore === null) continue;

      for (const role of reviewerRoles) {
        const key = `${scoreEntry.dimensionId}::${role}`;
        const current = roleDimensionBuckets.get(key) ?? { sum: 0, count: 0 };
        current.sum += numericScore;
        current.count += 1;
        roleDimensionBuckets.set(key, current);
      }
    }
  }

  const roleDimensionAverages = Array.from(roleDimensionBuckets.entries()).map(
    ([key, value]) => {
      const [dimensionId, role] = key.split('::');
      return {
        dimensionId,
        role: role as EvaluatorRole,
        average: value.count > 0 ? value.sum / value.count : null,
        count: value.count,
      };
    }
  );

  const dimensionNameById = new Map(
    params.dimensions.map((dimension) => [dimension.id, dimension.name])
  );

  const divergenceFlags = calculatePairwiseDivergence(
    roleDimensionAverages,
    params.divergenceThreshold ?? 2
  ).map((flag) => ({
    dimensionId: flag.dimensionId,
    dimensionName: dimensionNameById.get(flag.dimensionId) ?? flag.dimensionId,
    roleA: flag.roleA,
    roleB: flag.roleB,
    averageA: flag.averageA,
    averageB: flag.averageB,
    difference: flag.difference,
  }));

  return {
    cycleId: params.cycle.id,
    cycleNumber: params.cycle.cycleNumber,
    openedAt: params.cycle.openedAt,
    closedAt: params.cycle.closedAt,
    isFinal: params.cycle.isFinal,
    lockedAt: params.cycle.lockedAt,
    evaluationsCount: params.cycle.evaluations.length,
    dimensions,
    overallAverage,
    qualityTier,
    divergenceFlags,
  };
}

export function toWeekStartKey(date: Date): string {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  utcDate.setUTCDate(utcDate.getUTCDate() + offsetToMonday);
  return utcDate.toISOString().slice(0, 10);
}

export function toRoundedNumber(value: number | null, decimals: number = 2): number | null {
  if (value === null) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
