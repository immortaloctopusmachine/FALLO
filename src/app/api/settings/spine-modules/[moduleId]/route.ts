import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import {
  normalizeAnimationArray,
  normalizeEventArray,
  normalizeGroup,
  normalizeSkeletonName,
  normalizeSkinArray,
  normalizeZOrder,
  toModuleResponse,
  toSkeletonStatus,
  toStringOrNull,
} from '../_normalizers';

// PATCH /api/settings/spine-modules/[moduleId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const adminResult = await requireAdmin(session.user.id);
    if (adminResult.response) return adminResult.response;

    const { moduleId } = await params;
    const body = await request.json();

    const existing = await prisma.spineSkeletonModule.findUnique({
      where: { id: moduleId },
      select: { id: true },
    });
    if (!existing) {
      return ApiErrors.notFound('Spine module');
    }

    const updateData: Prisma.SpineSkeletonModuleUpdateInput = {};

    if (body?.skeletonName !== undefined) {
      const skeletonName = normalizeSkeletonName(body.skeletonName);
      if (!skeletonName) return ApiErrors.validation('skeletonName cannot be empty');

      const duplicate = await prisma.spineSkeletonModule.findUnique({
        where: { skeletonName },
        select: { id: true },
      });
      if (duplicate && duplicate.id !== moduleId) {
        return ApiErrors.validation('A module with this skeletonName already exists');
      }

      updateData.skeletonName = skeletonName;
    }

    if (body?.group !== undefined) {
      updateData.group = normalizeGroup(body.group);
    }

    if (body?.status !== undefined) {
      updateData.status = toSkeletonStatus(body.status);
    }

    if (body?.zOrder !== undefined) {
      updateData.zOrder = normalizeZOrder(body.zOrder);
    }

    if (body?.description !== undefined) {
      updateData.description = toStringOrNull(body.description);
    }

    if (body?.placementParent !== undefined) {
      updateData.placementParent = toStringOrNull(body.placementParent);
    }

    if (body?.placementBone !== undefined) {
      updateData.placementBone = toStringOrNull(body.placementBone);
    }

    if (body?.placementNotes !== undefined) {
      updateData.placementNotes = toStringOrNull(body.placementNotes);
    }

    if (body?.generalNotes !== undefined) {
      updateData.generalNotes = toStringOrNull(body.generalNotes);
    }

    if (body?.animations !== undefined) {
      updateData.animations = normalizeAnimationArray(body.animations) as unknown as Prisma.InputJsonValue;
    }

    if (body?.skins !== undefined) {
      updateData.skins = normalizeSkinArray(body.skins) as unknown as Prisma.InputJsonValue;
    }

    if (body?.events !== undefined) {
      updateData.events = normalizeEventArray(body.events) as unknown as Prisma.InputJsonValue;
    }

    const updated = await prisma.spineSkeletonModule.update({
      where: { id: moduleId },
      data: updateData,
    });

    return apiSuccess(toModuleResponse(updated));
  } catch (error) {
    console.error('Failed to update spine module:', error);
    return ApiErrors.internal('Failed to update spine module');
  }
}

// DELETE /api/settings/spine-modules/[moduleId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const adminResult = await requireAdmin(session.user.id);
    if (adminResult.response) return adminResult.response;

    const { moduleId } = await params;

    const existing = await prisma.spineSkeletonModule.findUnique({
      where: { id: moduleId },
      select: { id: true },
    });
    if (!existing) {
      return ApiErrors.notFound('Spine module');
    }

    await prisma.spineSkeletonModule.delete({
      where: { id: moduleId },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete spine module:', error);
    return ApiErrors.internal('Failed to delete spine module');
  }
}
