import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import {
  audienceFromDimensionRoles,
  requireSuperAdminQualityAccess,
  REVIEW_DIMENSION_INCLUDE,
} from '@/lib/quality-review-api';

function serializeDimension(
  dimension: {
    id: string;
    name: string;
    description: string | null;
    position: number;
    isActive: boolean;
    dimensionRoles: Array<{ role: 'LEAD' | 'PO' | 'HEAD_OF_ART' }>;
  }
) {
  return {
    id: dimension.id,
    name: dimension.name,
    description: dimension.description,
    position: dimension.position,
    isActive: dimension.isActive,
    audience: audienceFromDimensionRoles(
      dimension.dimensionRoles.map((dimensionRole) => dimensionRole.role)
    ),
    roles: dimension.dimensionRoles.map((dimensionRole) => dimensionRole.role),
  };
}

// PUT /api/review-questions/reorder
export async function PUT(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: superAdminResponse } = await requireSuperAdminQualityAccess(
      prisma,
      session.user.id
    );
    if (superAdminResponse) return superAdminResponse;

    const body = await request.json();

    if (!Array.isArray(body?.questionIds) || body.questionIds.length === 0) {
      return ApiErrors.validation('questionIds must be a non-empty array');
    }

    const questionIds = body.questionIds.filter(
      (questionId: unknown): questionId is string =>
        typeof questionId === 'string' && questionId.trim().length > 0
    );

    if (questionIds.length !== body.questionIds.length) {
      return ApiErrors.validation('questionIds must contain only non-empty strings');
    }

    if (new Set(questionIds).size !== questionIds.length) {
      return ApiErrors.validation('questionIds cannot contain duplicates');
    }

    const existingQuestions = await prisma.reviewDimension.findMany({
      select: {
        id: true,
      },
    });

    const existingIds = new Set(existingQuestions.map((question) => question.id));

    if (existingIds.size !== questionIds.length) {
      return ApiErrors.validation('questionIds must include all existing review questions');
    }

    for (const questionId of questionIds) {
      if (!existingIds.has(questionId)) {
        return ApiErrors.validation(`Unknown questionId: ${questionId}`);
      }
    }

    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < questionIds.length; index += 1) {
        await tx.reviewDimension.update({
          where: {
            id: questionIds[index],
          },
          data: {
            position: index + 1,
          },
        });
      }
    });

    const updated = await prisma.reviewDimension.findMany({
      orderBy: {
        position: 'asc',
      },
      include: {
        ...REVIEW_DIMENSION_INCLUDE,
      },
    });

    return apiSuccess({
      questions: updated.map(serializeDimension),
    });
  } catch (error) {
    console.error('Failed to reorder review questions:', error);
    return ApiErrors.internal('Failed to reorder review questions');
  }
}
