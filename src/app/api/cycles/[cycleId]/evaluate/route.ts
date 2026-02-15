import type { ReviewScoreValue } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import {
  getApplicableReviewDimensionsForCard,
  parseReviewScoreValue,
  requireEvaluatorAccess,
} from '@/lib/quality-review-api';

interface ParsedScoreInput {
  dimensionId: string;
  score: ReviewScoreValue;
}

function parseScoresPayload(rawScores: unknown): {
  parsedScores: ParsedScoreInput[];
  errorMessage: string | null;
} {
  if (!Array.isArray(rawScores) || rawScores.length === 0) {
    return {
      parsedScores: [],
      errorMessage: 'scores must be a non-empty array',
    };
  }

  const parsedScores: ParsedScoreInput[] = [];
  const seenDimensionIds = new Set<string>();

  for (const rawScore of rawScores) {
    if (!rawScore || typeof rawScore !== 'object' || Array.isArray(rawScore)) {
      return {
        parsedScores: [],
        errorMessage: 'Each score entry must be an object',
      };
    }

    const row = rawScore as Record<string, unknown>;
    const dimensionId = typeof row.dimensionId === 'string' ? row.dimensionId.trim() : '';

    if (!dimensionId) {
      return {
        parsedScores: [],
        errorMessage: 'Each score entry requires a valid dimensionId',
      };
    }

    if (seenDimensionIds.has(dimensionId)) {
      return {
        parsedScores: [],
        errorMessage: `Duplicate dimensionId in scores payload: ${dimensionId}`,
      };
    }

    const score = parseReviewScoreValue(row.score);
    if (!score) {
      return {
        parsedScores: [],
        errorMessage: `Invalid score value for dimension ${dimensionId}`,
      };
    }

    seenDimensionIds.add(dimensionId);
    parsedScores.push({ dimensionId, score });
  }

  return {
    parsedScores,
    errorMessage: null,
  };
}

async function getCycleAndEligibleDimensions(
  cycleId: string,
  evaluatorRoles: Array<'LEAD' | 'PO' | 'HEAD_OF_ART'>
) {
  const cycle = await prisma.reviewCycle.findUnique({
    where: {
      id: cycleId,
    },
    select: {
      id: true,
      cycleNumber: true,
      lockedAt: true,
      cardId: true,
      card: {
        select: {
          id: true,
          title: true,
          type: true,
          taskData: true,
          list: {
            select: {
              id: true,
              name: true,
              phase: true,
              viewType: true,
              boardId: true,
            },
          },
        },
      },
    },
  });

  if (!cycle) {
    return {
      cycle: null,
      eligibleDimensions: [],
    };
  }

  const eligibleDimensions = await getApplicableReviewDimensionsForCard(
    prisma,
    cycle.card,
    evaluatorRoles
  );

  return {
    cycle,
    eligibleDimensions,
  };
}

// GET /api/cycles/[cycleId]/evaluate
export async function GET(
  request: Request,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { access, response: evaluatorResponse } = await requireEvaluatorAccess(
      prisma,
      session.user.id
    );
    if (evaluatorResponse) return evaluatorResponse;

    const { cycleId } = await params;

    const { cycle, eligibleDimensions } = await getCycleAndEligibleDimensions(
      cycleId,
      access.evaluatorRoles
    );

    if (!cycle) {
      return ApiErrors.notFound('Review cycle');
    }

    const existingEvaluation = await prisma.evaluation.findUnique({
      where: {
        reviewCycleId_reviewerId: {
          reviewCycleId: cycleId,
          reviewerId: session.user.id,
        },
      },
      select: {
        id: true,
        submittedAt: true,
        updatedAt: true,
        scores: {
          select: {
            dimensionId: true,
            score: true,
          },
        },
      },
    });

    return apiSuccess({
      cycle: {
        id: cycle.id,
        cycleNumber: cycle.cycleNumber,
        lockedAt: cycle.lockedAt,
      },
      card: {
        id: cycle.card.id,
        title: cycle.card.title,
        boardId: cycle.card.list.boardId,
      },
      evaluatorRoles: access.evaluatorRoles,
      canEdit: cycle.lockedAt === null && eligibleDimensions.length > 0,
      hasExistingEvaluation: Boolean(existingEvaluation),
      existingEvaluation: existingEvaluation
        ? {
            id: existingEvaluation.id,
            submittedAt: existingEvaluation.submittedAt,
            updatedAt: existingEvaluation.updatedAt,
            scores: existingEvaluation.scores,
          }
        : null,
      dimensions: eligibleDimensions
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((dimension) => ({
          id: dimension.id,
          name: dimension.name,
          description: dimension.description,
          position: dimension.position,
        })),
    });
  } catch (error) {
    console.error('Failed to fetch evaluation form data:', error);
    return ApiErrors.internal('Failed to fetch evaluation form data');
  }
}

// POST /api/cycles/[cycleId]/evaluate
export async function POST(
  request: Request,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { access, response: evaluatorResponse } = await requireEvaluatorAccess(
      prisma,
      session.user.id
    );
    if (evaluatorResponse) return evaluatorResponse;

    const { cycleId } = await params;

    const body = await request.json();
    const { parsedScores, errorMessage } = parseScoresPayload(body?.scores);
    if (errorMessage) {
      return ApiErrors.validation(errorMessage);
    }

    const { cycle, eligibleDimensions } = await getCycleAndEligibleDimensions(
      cycleId,
      access.evaluatorRoles
    );

    if (!cycle) {
      return ApiErrors.notFound('Review cycle');
    }

    if (cycle.lockedAt) {
      return ApiErrors.forbidden('Card is completed. Evaluations are locked');
    }

    if (eligibleDimensions.length === 0) {
      return ApiErrors.validation(
        'No eligible review dimensions are configured for this card and evaluator role'
      );
    }

    const eligibleDimensionIds = new Set(eligibleDimensions.map((dimension) => dimension.id));

    for (const scoreRow of parsedScores) {
      if (!eligibleDimensionIds.has(scoreRow.dimensionId)) {
        return ApiErrors.validation(
          `Dimension ${scoreRow.dimensionId} is not eligible for this evaluator on this card`
        );
      }
    }

    const existing = await prisma.evaluation.findUnique({
      where: {
        reviewCycleId_reviewerId: {
          reviewCycleId: cycleId,
          reviewerId: session.user.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return ApiErrors.conflict(
        'Evaluation already exists for this cycle. Use PATCH to update your evaluation.'
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const evaluation = await tx.evaluation.create({
        data: {
          reviewCycleId: cycleId,
          reviewerId: session.user.id,
        },
        select: {
          id: true,
          reviewCycleId: true,
          reviewerId: true,
          submittedAt: true,
          updatedAt: true,
        },
      });

      await tx.evaluationScore.createMany({
        data: parsedScores.map((scoreRow) => ({
          evaluationId: evaluation.id,
          dimensionId: scoreRow.dimensionId,
          score: scoreRow.score,
        })),
      });

      return evaluation;
    });

    return apiSuccess(
      {
        ...created,
        cycleNumber: cycle.cycleNumber,
        cardId: cycle.cardId,
        cardTitle: cycle.card.title,
        scoreCount: parsedScores.length,
      },
      201
    );
  } catch (error) {
    console.error('Failed to submit evaluation:', error);
    return ApiErrors.internal('Failed to submit evaluation');
  }
}

// PATCH /api/cycles/[cycleId]/evaluate
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { access, response: evaluatorResponse } = await requireEvaluatorAccess(
      prisma,
      session.user.id
    );
    if (evaluatorResponse) return evaluatorResponse;

    const { cycleId } = await params;

    const body = await request.json();
    const { parsedScores, errorMessage } = parseScoresPayload(body?.scores);
    if (errorMessage) {
      return ApiErrors.validation(errorMessage);
    }

    const { cycle, eligibleDimensions } = await getCycleAndEligibleDimensions(
      cycleId,
      access.evaluatorRoles
    );

    if (!cycle) {
      return ApiErrors.notFound('Review cycle');
    }

    if (cycle.lockedAt) {
      return ApiErrors.forbidden('Card is completed. Evaluations are locked');
    }

    if (eligibleDimensions.length === 0) {
      return ApiErrors.validation(
        'No eligible review dimensions are configured for this card and evaluator role'
      );
    }

    const eligibleDimensionIds = new Set(eligibleDimensions.map((dimension) => dimension.id));

    for (const scoreRow of parsedScores) {
      if (!eligibleDimensionIds.has(scoreRow.dimensionId)) {
        return ApiErrors.validation(
          `Dimension ${scoreRow.dimensionId} is not eligible for this evaluator on this card`
        );
      }
    }

    const existing = await prisma.evaluation.findUnique({
      where: {
        reviewCycleId_reviewerId: {
          reviewCycleId: cycleId,
          reviewerId: session.user.id,
        },
      },
      select: {
        id: true,
        submittedAt: true,
      },
    });

    if (!existing) {
      return ApiErrors.notFound('Evaluation');
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.evaluationScore.deleteMany({
        where: {
          evaluationId: existing.id,
        },
      });

      await tx.evaluationScore.createMany({
        data: parsedScores.map((scoreRow) => ({
          evaluationId: existing.id,
          dimensionId: scoreRow.dimensionId,
          score: scoreRow.score,
        })),
      });

      return tx.evaluation.update({
        where: {
          id: existing.id,
        },
        data: {
          submittedAt: existing.submittedAt,
        },
        select: {
          id: true,
          reviewCycleId: true,
          reviewerId: true,
          submittedAt: true,
          updatedAt: true,
        },
      });
    });

    return apiSuccess({
      ...updated,
      cycleNumber: cycle.cycleNumber,
      cardId: cycle.cardId,
      cardTitle: cycle.card.title,
      scoreCount: parsedScores.length,
    });
  } catch (error) {
    console.error('Failed to update evaluation:', error);
    return ApiErrors.internal('Failed to update evaluation');
  }
}
