import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// PATCH /api/settings/tags/[tagId] - Update a tag
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { tagId } = await params;
    const body = await request.json();
    const { name, description, color, position } = body;

    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!existingTag) {
      return ApiErrors.notFound('Tag');
    }

    // Check for duplicate name if name is changing
    if (name && name.trim() !== existingTag.name) {
      const duplicate = await prisma.tag.findFirst({
        where: {
          studioId: null,
          name: name.trim(),
          id: { not: tagId },
        },
      });

      if (duplicate) {
        return ApiErrors.validation('A tag with this name already exists');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (color !== undefined) updateData.color = color || null;
    if (position !== undefined) updateData.position = position;

    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: updateData,
    });

    return apiSuccess(tag);
  } catch (error) {
    console.error('Failed to update tag:', error);
    return ApiErrors.internal('Failed to update tag');
  }
}

// DELETE /api/settings/tags/[tagId] - Delete a tag
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { tagId } = await params;

    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!existingTag) {
      return ApiErrors.notFound('Tag');
    }

    // Delete tag (cascades to cardTags)
    await prisma.tag.delete({
      where: { id: tagId },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete tag:', error);
    return ApiErrors.internal('Failed to delete tag');
  }
}
