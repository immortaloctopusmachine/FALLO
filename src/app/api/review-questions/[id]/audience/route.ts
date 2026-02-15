import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import {
  audienceFromDimensionRoles,
  parseReviewQuestionAudience,
  requireSuperAdminQualityAccess,
  REVIEW_DIMENSION_INCLUDE,
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

// PUT /api/review-questions/[id]/audience
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: superAdminResponse } = await requireSuperAdminQualityAccess(
      prisma,
      session.user.id
    );
    if (superAdminResponse) return superAdminResponse;

    const { id } = await params;
    const body = await request.json();

    const audience = parseReviewQuestionAudience(body?.audience);
    if (!audience) {
      return ApiErrors.validation('audience must be one of: LEAD, PO, BOTH');
    }

    const existing = await prisma.reviewDimension.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return ApiErrors.notFound('Review question');
    }

    await prisma.$transaction(async (tx) => {
      await tx.dimensionRole.deleteMany({
        where: {
          dimensionId: id,
        },
      });

      const roles = rolesForAudience(audience);

      await tx.dimensionRole.createMany({
        data: roles.map((role) => ({
          dimensionId: id,
          role,
        })),
      });
    });

    const updated = await prisma.reviewDimension.findUnique({
      where: {
        id,
      },
      include: {
        ...REVIEW_DIMENSION_INCLUDE,
      },
    });

    if (!updated) {
      return ApiErrors.internal('Failed to fetch updated review question');
    }

    return apiSuccess(serializeDimension(updated));
  } catch (error) {
    console.error('Failed to update review question audience:', error);
    return ApiErrors.internal('Failed to update review question audience');
  }
}
