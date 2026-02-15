import type { Prisma, PrismaClient } from '@prisma/client';
import {
  aggregateDimensionScores,
  computeOverallAverage,
  qualityTierFromAverage,
  type QualityTier,
} from '@/lib/quality-review';

type ReviewDbClient = PrismaClient | Prisma.TransactionClient;

export interface CardFinalQualitySummary {
  overallAverage: number | null;
  qualityTier: QualityTier;
}

export function getStoryPointsFromTaskData(taskData: Prisma.JsonValue | null): number {
  if (!taskData || typeof taskData !== 'object' || Array.isArray(taskData)) {
    return 0;
  }

  const storyPoints = (taskData as Record<string, unknown>).storyPoints;
  if (typeof storyPoints !== 'number' || Number.isNaN(storyPoints)) {
    return 0;
  }

  return Math.max(0, storyPoints);
}

export function extractLinkedUserStoryId(taskData: Prisma.JsonValue | null): string | null {
  if (!taskData || typeof taskData !== 'object' || Array.isArray(taskData)) {
    return null;
  }

  const linkedUserStoryId = (taskData as Record<string, unknown>).linkedUserStoryId;
  if (typeof linkedUserStoryId !== 'string') {
    return null;
  }

  const trimmed = linkedUserStoryId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function buildFinalQualitySummaryByCardId(
  db: ReviewDbClient,
  cardIds: string[]
): Promise<Map<string, CardFinalQualitySummary>> {
  const uniqueCardIds = Array.from(new Set(cardIds)).filter(Boolean);
  if (uniqueCardIds.length === 0) {
    return new Map();
  }

  const finalCycles = await db.reviewCycle.findMany({
    where: {
      isFinal: true,
      cardId: {
        in: uniqueCardIds,
      },
    },
    select: {
      cardId: true,
      evaluations: {
        select: {
          scores: {
            select: {
              dimensionId: true,
              score: true,
            },
          },
        },
      },
    },
  });

  const summaryByCardId = new Map<string, CardFinalQualitySummary>();

  for (const cycle of finalCycles) {
    const scoreInputs = cycle.evaluations.flatMap((evaluation) =>
      evaluation.scores.map((score) => ({
        dimensionId: score.dimensionId,
        score: score.score,
      }))
    );

    const overallAverage = computeOverallAverage(
      aggregateDimensionScores(scoreInputs).map((aggregate) => ({
        average: aggregate.average,
      }))
    );

    summaryByCardId.set(cycle.cardId, {
      overallAverage,
      qualityTier: qualityTierFromAverage(overallAverage),
    });
  }

  return summaryByCardId;
}
