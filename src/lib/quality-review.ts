import type {
  EvaluatorRole,
  Prisma,
  PrismaClient,
  ReviewScoreValue,
} from '@prisma/client';

const REVIEW_NAME_HINTS = ['review'];
const DONE_NAME_HINTS = ['done', 'complete', 'completed', 'finished'];
const LEAD_ROLE_HINTS = ['lead'];
const PO_ROLE_HINTS = ['po', 'product owner'];
const HEAD_OF_ART_ROLE_HINTS = ['head of art', 'headofart'];

export const REVIEW_TRANSIENT_WINDOW_MS = 2_000;

type ReviewDbClient = PrismaClient | Prisma.TransactionClient;

export interface TransitionListContext {
  id: string;
  name: string;
  phase: string | null;
  viewType: string;
}

export interface HandleCardListTransitionParams {
  cardId: string;
  fromList: TransitionListContext;
  toList: TransitionListContext;
  boardSettings?: Prisma.JsonValue | null;
  now?: Date;
}

export interface HandleCardListTransitionResult {
  enteredReview: boolean;
  leftReview: boolean;
  movedToDone: boolean;
  reopenedFromDone: boolean;
  cycleOpened: boolean;
  cycleClosed: boolean;
  cycleDeletedAsTransient: boolean;
  cardLocked: boolean;
  cardUnlocked: boolean;
  finalCycleId: string | null;
}

export type ConfidenceLevel = 'GREEN' | 'AMBER' | 'RED';
export type QualityTier = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';

export interface DimensionScoreInput {
  dimensionId: string;
  score: ReviewScoreValue;
}

export interface DimensionAggregate {
  dimensionId: string;
  average: number | null;
  count: number;
  confidence: ConfidenceLevel;
}

export interface RoleDimensionAverageInput {
  dimensionId: string;
  role: EvaluatorRole;
  average: number | null;
  count: number;
}

export interface DivergenceFlag {
  dimensionId: string;
  roleA: EvaluatorRole;
  roleB: EvaluatorRole;
  averageA: number;
  averageB: number;
  difference: number;
}

const DIVERGENCE_PAIRS: Array<[EvaluatorRole, EvaluatorRole]> = [
  ['LEAD', 'PO'],
  ['LEAD', 'HEAD_OF_ART'],
  ['PO', 'HEAD_OF_ART'],
];

function normalizeRoleName(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

function scoreToNumericValue(score: ReviewScoreValue): number | null {
  if (score === 'LOW') return 1;
  if (score === 'MEDIUM') return 2;
  if (score === 'HIGH') return 3;
  return null;
}

function extractReviewListIds(settings?: Prisma.JsonValue | null): Set<string> {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return new Set();
  }

  const maybeReviewListIds = (settings as Record<string, unknown>).reviewListIds;
  if (!Array.isArray(maybeReviewListIds)) {
    return new Set();
  }

  return new Set(
    maybeReviewListIds.filter((value): value is string => typeof value === 'string')
  );
}

function isTasksList(list: TransitionListContext): boolean {
  return list.viewType === 'TASKS';
}

export function isReviewList(
  list: TransitionListContext,
  reviewListIds?: Set<string>
): boolean {
  if (!isTasksList(list)) return false;

  if (reviewListIds && reviewListIds.size > 0) {
    return reviewListIds.has(list.id);
  }

  const listName = list.name.trim().toLowerCase();
  return REVIEW_NAME_HINTS.some((hint) => listName.includes(hint));
}

export function isDoneList(list: TransitionListContext): boolean {
  if (!isTasksList(list)) return false;
  if (list.phase === 'DONE') return true;

  const listName = list.name.trim().toLowerCase();
  return DONE_NAME_HINTS.some((hint) => listName.includes(hint));
}

async function openReviewCycle(
  db: ReviewDbClient,
  cardId: string,
  now: Date
): Promise<string | null> {
  const openCycle = await db.reviewCycle.findFirst({
    where: { cardId, closedAt: null },
    select: { id: true },
  });

  if (openCycle) {
    return null;
  }

  const latestCycle = await db.reviewCycle.findFirst({
    where: { cardId },
    orderBy: { cycleNumber: 'desc' },
    select: { cycleNumber: true },
  });

  const cycleNumber = (latestCycle?.cycleNumber ?? 0) + 1;

  const created = await db.reviewCycle.create({
    data: {
      cardId,
      cycleNumber,
      openedAt: now,
    },
    select: { id: true },
  });

  return created.id;
}

async function closeReviewCycle(
  db: ReviewDbClient,
  cardId: string,
  now: Date
): Promise<{ closedCycleId: string | null; deletedTransient: boolean }> {
  const openCycle = await db.reviewCycle.findFirst({
    where: { cardId, closedAt: null },
    orderBy: { cycleNumber: 'desc' },
    select: { id: true, openedAt: true },
  });

  if (!openCycle) {
    return { closedCycleId: null, deletedTransient: false };
  }

  const cycleAgeMs = now.getTime() - openCycle.openedAt.getTime();
  if (cycleAgeMs < REVIEW_TRANSIENT_WINDOW_MS) {
    const evaluationCount = await db.evaluation.count({
      where: { reviewCycleId: openCycle.id },
    });

    if (evaluationCount === 0) {
      await db.reviewCycle.delete({
        where: { id: openCycle.id },
      });

      return { closedCycleId: null, deletedTransient: true };
    }
  }

  await db.reviewCycle.update({
    where: { id: openCycle.id },
    data: { closedAt: now },
  });

  return { closedCycleId: openCycle.id, deletedTransient: false };
}

async function markFinalAndLockCardCycles(
  db: ReviewDbClient,
  cardId: string,
  now: Date
): Promise<string | null> {
  await db.reviewCycle.updateMany({
    where: { cardId },
    data: { isFinal: false },
  });

  const latestCycle = await db.reviewCycle.findFirst({
    where: { cardId },
    orderBy: { cycleNumber: 'desc' },
    select: { id: true },
  });

  if (latestCycle) {
    await db.reviewCycle.update({
      where: { id: latestCycle.id },
      data: { isFinal: true },
    });
  }

  await db.reviewCycle.updateMany({
    where: { cardId, lockedAt: null },
    data: { lockedAt: now },
  });

  return latestCycle?.id ?? null;
}

async function clearFinalAndUnlockCardCycles(
  db: ReviewDbClient,
  cardId: string
): Promise<void> {
  await db.reviewCycle.updateMany({
    where: { cardId },
    data: { isFinal: false, lockedAt: null },
  });
}

export async function handleCardListTransition(
  db: ReviewDbClient,
  params: HandleCardListTransitionParams
): Promise<HandleCardListTransitionResult> {
  const now = params.now ?? new Date();
  const reviewListIds = extractReviewListIds(params.boardSettings);

  const fromReview = isReviewList(params.fromList, reviewListIds);
  const toReview = isReviewList(params.toList, reviewListIds);
  const fromDone = isDoneList(params.fromList);
  const toDone = isDoneList(params.toList);

  const result: HandleCardListTransitionResult = {
    enteredReview: toReview && !fromReview,
    leftReview: fromReview && !toReview,
    movedToDone: toDone && !fromDone,
    reopenedFromDone: fromDone && !toDone,
    cycleOpened: false,
    cycleClosed: false,
    cycleDeletedAsTransient: false,
    cardLocked: false,
    cardUnlocked: false,
    finalCycleId: null,
  };

  if (result.enteredReview) {
    const openedCycleId = await openReviewCycle(db, params.cardId, now);
    result.cycleOpened = Boolean(openedCycleId);
  }

  if (result.leftReview) {
    const { closedCycleId, deletedTransient } = await closeReviewCycle(
      db,
      params.cardId,
      now
    );
    result.cycleClosed = Boolean(closedCycleId);
    result.cycleDeletedAsTransient = deletedTransient;
  }

  if (result.movedToDone) {
    result.finalCycleId = await markFinalAndLockCardCycles(db, params.cardId, now);
    result.cardLocked = true;
  }

  if (result.reopenedFromDone) {
    await clearFinalAndUnlockCardCycles(db, params.cardId);
    result.cardUnlocked = true;
  }

  return result;
}

export async function closeAndLockCardReviewCycles(
  db: ReviewDbClient,
  cardId: string,
  now: Date = new Date()
): Promise<void> {
  await db.reviewCycle.updateMany({
    where: { cardId, closedAt: null },
    data: { closedAt: now },
  });

  await db.reviewCycle.updateMany({
    where: { cardId, lockedAt: null },
    data: { lockedAt: now },
  });
}

export function resolveEvaluatorRolesFromRoleNames(
  roleNames: string[]
): EvaluatorRole[] {
  const roles = new Set<EvaluatorRole>();

  for (const roleName of roleNames) {
    const normalized = normalizeRoleName(roleName);

    if (
      HEAD_OF_ART_ROLE_HINTS.some((hint) => normalized.includes(hint)) ||
      normalized === 'head art'
    ) {
      roles.add('HEAD_OF_ART');
      continue;
    }

    if (
      PO_ROLE_HINTS.some(
        (hint) =>
          normalized === hint ||
          normalized.includes(hint) ||
          normalized.replace(/\./g, '') === hint
      )
    ) {
      roles.add('PO');
    }

    if (
      LEAD_ROLE_HINTS.some(
        (hint) =>
          normalized === hint ||
          normalized.endsWith(` ${hint}`) ||
          normalized.startsWith(`${hint} `)
      )
    ) {
      roles.add('LEAD');
    }
  }

  return Array.from(roles);
}

export function resolveEvaluatorRolesFromUserCompanyRoles(
  userCompanyRoles: Array<{ companyRole: { name: string } }>
): EvaluatorRole[] {
  return resolveEvaluatorRolesFromRoleNames(
    userCompanyRoles.map((item) => item.companyRole.name)
  );
}

export async function getUserEvaluatorRoles(
  db: ReviewDbClient,
  userId: string
): Promise<EvaluatorRole[]> {
  const userCompanyRoles = await db.userCompanyRole.findMany({
    where: { userId },
    select: {
      companyRole: {
        select: { name: true },
      },
    },
  });

  return resolveEvaluatorRolesFromUserCompanyRoles(userCompanyRoles);
}

export function confidenceFromSampleSize(count: number): ConfidenceLevel {
  if (count >= 20) return 'GREEN';
  if (count >= 5) return 'AMBER';
  return 'RED';
}

export function aggregateDimensionScores(
  scores: DimensionScoreInput[]
): DimensionAggregate[] {
  const byDimension = new Map<
    string,
    { sum: number; count: number }
  >();

  for (const entry of scores) {
    const numericScore = scoreToNumericValue(entry.score);
    if (numericScore === null) continue;

    const current = byDimension.get(entry.dimensionId) ?? { sum: 0, count: 0 };
    current.sum += numericScore;
    current.count += 1;
    byDimension.set(entry.dimensionId, current);
  }

  return Array.from(byDimension.entries()).map(([dimensionId, value]) => ({
    dimensionId,
    average: value.count > 0 ? value.sum / value.count : null,
    count: value.count,
    confidence: confidenceFromSampleSize(value.count),
  }));
}

export function computeOverallAverage(
  dimensionAggregates: Array<{ average: number | null }>
): number | null {
  const usableAverages = dimensionAggregates
    .map((item) => item.average)
    .filter((value): value is number => typeof value === 'number');

  if (usableAverages.length === 0) return null;

  const sum = usableAverages.reduce((total, value) => total + value, 0);
  return sum / usableAverages.length;
}

export function qualityTierFromAverage(average: number | null): QualityTier {
  if (average === null) return 'UNSCORED';
  if (average >= 2.5) return 'HIGH';
  if (average >= 1.5) return 'MEDIUM';
  return 'LOW';
}

export function calculatePairwiseDivergence(
  roleDimensionAverages: RoleDimensionAverageInput[],
  threshold: number = 2
): DivergenceFlag[] {
  const byDimension = new Map<
    string,
    Partial<Record<EvaluatorRole, { average: number; count: number }>>
  >();

  for (const entry of roleDimensionAverages) {
    if (entry.average === null || entry.count <= 0) continue;

    const current = byDimension.get(entry.dimensionId) ?? {};
    current[entry.role] = { average: entry.average, count: entry.count };
    byDimension.set(entry.dimensionId, current);
  }

  const flags: DivergenceFlag[] = [];

  for (const [dimensionId, roleAverages] of byDimension.entries()) {
    for (const [roleA, roleB] of DIVERGENCE_PAIRS) {
      const avgA = roleAverages[roleA];
      const avgB = roleAverages[roleB];
      if (!avgA || !avgB) continue;

      const difference = Math.abs(avgA.average - avgB.average);
      if (difference < threshold) continue;

      flags.push({
        dimensionId,
        roleA,
        roleB,
        averageA: avgA.average,
        averageB: avgB.average,
        difference,
      });
    }
  }

  return flags;
}
