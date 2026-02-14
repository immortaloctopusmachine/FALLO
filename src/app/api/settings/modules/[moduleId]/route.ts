import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import {
  normalizeModuleTaskTemplates,
} from '@/lib/modules';
import { Prisma } from '@prisma/client';

// PATCH /api/settings/modules/[moduleId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { moduleId } = await params;
    const body = await request.json();

    const existing = await prisma.boardModule.findUnique({
      where: { id: moduleId },
      select: { id: true },
    });

    if (!existing) {
      return ApiErrors.notFound('Module');
    }

    const updateData: Record<string, unknown> = {};

    if (body?.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) return ApiErrors.validation('Module name cannot be empty');
      updateData.name = name;
    }

    if (body?.description !== undefined) {
      updateData.description = typeof body.description === 'string'
        ? body.description.trim() || null
        : null;
    }

    if (body?.symbol !== undefined) {
      const symbol = typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';
      if (!symbol) return ApiErrors.validation('Module symbol cannot be empty');

      const duplicate = await prisma.boardModule.findUnique({
        where: { symbol },
        select: { id: true },
      });

      if (duplicate && duplicate.id !== moduleId) {
        return ApiErrors.validation('A module with this symbol already exists');
      }

      updateData.symbol = symbol;
    }

    if (body?.epicName !== undefined) {
      const epicName = typeof body.epicName === 'string' ? body.epicName.trim() : '';
      if (!epicName) return ApiErrors.validation('Epic name cannot be empty');
      updateData.epicName = epicName;
    }

    if (body?.userStoryDescription !== undefined) {
      updateData.userStoryDescription = typeof body.userStoryDescription === 'string'
        ? body.userStoryDescription.trim() || null
        : null;
    }

    if (body?.userStoryFeatureImage !== undefined) {
      updateData.userStoryFeatureImage = typeof body.userStoryFeatureImage === 'string'
        ? body.userStoryFeatureImage.trim() || null
        : null;
    }

    if (body?.taskTemplates !== undefined) {
      const taskTemplates = normalizeModuleTaskTemplates(body.taskTemplates);
      if (taskTemplates.length === 0) {
        return ApiErrors.validation('At least one task template is required');
      }
      updateData.taskTemplates = taskTemplates as unknown as Prisma.InputJsonValue;
    }

    const updated = await prisma.boardModule.update({
      where: { id: moduleId },
      data: updateData,
    });

    return apiSuccess({
      ...updated,
      taskTemplates: normalizeModuleTaskTemplates(updated.taskTemplates),
    });
  } catch (error) {
    console.error('Failed to update module:', error);
    return ApiErrors.internal('Failed to update module');
  }
}

// DELETE /api/settings/modules/[moduleId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { moduleId } = await params;

    const existing = await prisma.boardModule.findUnique({
      where: { id: moduleId },
      select: { id: true },
    });

    if (!existing) {
      return ApiErrors.notFound('Module');
    }

    await prisma.boardModule.delete({ where: { id: moduleId } });
    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete module:', error);
    return ApiErrors.internal('Failed to delete module');
  }
}
