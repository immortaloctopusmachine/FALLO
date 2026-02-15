import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import {
  audienceFromDimensionRoles,
  parseReviewQuestionAudience,
  requireNonViewerQualityAccess,
  requireSuperAdminQualityAccess,
  REVIEW_DIMENSION_INCLUDE,
  REVIEW_SCORE_VALUES,
  rolesForAudience,
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

// GET /api/review-questions
export async function GET() {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: qualityAccessResponse } = await requireNonViewerQualityAccess(
      prisma,
      session.user.id
    );
    if (qualityAccessResponse) return qualityAccessResponse;

    const dimensions = await prisma.reviewDimension.findMany({
      orderBy: {
        position: 'asc',
      },
      include: {
        ...REVIEW_DIMENSION_INCLUDE,
      },
    });

    return apiSuccess({
      scoringOptions: REVIEW_SCORE_VALUES,
      questions: dimensions.map(serializeDimension),
    });
  } catch (error) {
    console.error('Failed to fetch review questions:', error);
    return ApiErrors.internal('Failed to fetch review questions');
  }
}

// POST /api/review-questions
export async function POST(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: superAdminResponse } = await requireSuperAdminQualityAccess(
      prisma,
      session.user.id
    );
    if (superAdminResponse) return superAdminResponse;

    const body = await request.json();

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const description =
      typeof body?.description === 'string' ? body.description.trim() || null : null;
    const isActive = typeof body?.isActive === 'boolean' ? body.isActive : true;

    if (!name) {
      return ApiErrors.validation('Question name is required');
    }

    const audience = parseReviewQuestionAudience(body?.audience) ?? 'BOTH';

    const maxPosition = await prisma.reviewDimension.aggregate({
      _max: {
        position: true,
      },
    });

    const created = await prisma.$transaction(async (tx) => {
      const dimension = await tx.reviewDimension.create({
        data: {
          name,
          description,
          isActive,
          position: (maxPosition._max.position ?? -1) + 1,
        },
      });

      const roles = rolesForAudience(audience);
      await tx.dimensionRole.createMany({
        data: roles.map((role) => ({
          dimensionId: dimension.id,
          role,
        })),
      });

      return tx.reviewDimension.findUnique({
        where: {
          id: dimension.id,
        },
        include: {
          ...REVIEW_DIMENSION_INCLUDE,
        },
      });
    });

    if (!created) {
      return ApiErrors.internal('Failed to create review question');
    }

    return apiSuccess(serializeDimension(created), 201);
  } catch (error) {
    console.error('Failed to create review question:', error);
    return ApiErrors.internal('Failed to create review question');
  }
}
