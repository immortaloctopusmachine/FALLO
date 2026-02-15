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

// PATCH /api/review-questions/[id]
export async function PATCH(
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

    const body = await request.json();

    const updateData: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    } = {};

    if (body?.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return ApiErrors.validation('Question name must be a non-empty string');
      }
      updateData.name = body.name.trim();
    }

    if (body?.description !== undefined) {
      if (body.description === null) {
        updateData.description = null;
      } else if (typeof body.description === 'string') {
        updateData.description = body.description.trim() || null;
      } else {
        return ApiErrors.validation('Question description must be a string or null');
      }
    }

    if (body?.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        return ApiErrors.validation('isActive must be a boolean');
      }
      updateData.isActive = body.isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return ApiErrors.validation('No valid fields provided for update');
    }

    await prisma.reviewDimension.update({
      where: {
        id,
      },
      data: updateData,
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
    console.error('Failed to update review question:', error);
    return ApiErrors.internal('Failed to update review question');
  }
}

// DELETE /api/review-questions/[id]
export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

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

    if (hardDelete) {
      await prisma.reviewDimension.delete({
        where: {
          id,
        },
      });

      return apiSuccess({
        id,
        deleted: true,
      });
    }

    await prisma.reviewDimension.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });

    return apiSuccess({
      id,
      deleted: false,
      deactivated: true,
    });
  } catch (error) {
    console.error('Failed to delete/deactivate review question:', error);
    return ApiErrors.internal('Failed to delete/deactivate review question');
  }
}
