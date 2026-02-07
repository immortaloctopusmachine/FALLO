import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// PATCH /api/settings/block-types/[blockTypeId] - Update a block type
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ blockTypeId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { blockTypeId } = await params;
    const body = await request.json();
    const { name, description, color, position } = body;

    // Check if block type exists
    const existingBlockType = await prisma.blockType.findUnique({
      where: { id: blockTypeId },
    });

    if (!existingBlockType) {
      return ApiErrors.notFound('Block type');
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (color !== undefined) updateData.color = color;
    if (position !== undefined) updateData.position = position;

    const blockType = await prisma.blockType.update({
      where: { id: blockTypeId },
      data: updateData,
    });

    return apiSuccess(blockType);
  } catch (error) {
    console.error('Failed to update block type:', error);
    return ApiErrors.internal('Failed to update block type');
  }
}

// DELETE /api/settings/block-types/[blockTypeId] - Delete a block type
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ blockTypeId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { blockTypeId } = await params;

    // Check if block type exists
    const existingBlockType = await prisma.blockType.findUnique({
      where: { id: blockTypeId },
      include: {
        _count: { select: { blocks: true } },
      },
    });

    if (!existingBlockType) {
      return ApiErrors.notFound('Block type');
    }

    // Prevent deletion if block type is in use
    if (existingBlockType._count.blocks > 0) {
      return ApiErrors.validation('Cannot delete block type that is in use');
    }

    // Prevent deletion of default block types
    if (existingBlockType.isDefault) {
      return ApiErrors.validation('Cannot delete default block types');
    }

    await prisma.blockType.delete({
      where: { id: blockTypeId },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete block type:', error);
    return ApiErrors.internal('Failed to delete block type');
  }
}
