import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// PATCH /api/settings/skills/[skillId] - Update a skill
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ skillId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { skillId } = await params;
    const body = await request.json();
    const { name, description, color, position } = body;

    // Check if skill exists
    const existingSkill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!existingSkill) {
      return ApiErrors.notFound('Skill');
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (color !== undefined) updateData.color = color || null;
    if (position !== undefined) updateData.position = position;

    const skill = await prisma.skill.update({
      where: { id: skillId },
      data: updateData,
    });

    return apiSuccess(skill);
  } catch (error) {
    console.error('Failed to update skill:', error);
    return ApiErrors.internal('Failed to update skill');
  }
}

// DELETE /api/settings/skills/[skillId] - Delete a skill
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ skillId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { skillId } = await params;

    // Check if skill exists
    const existingSkill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!existingSkill) {
      return ApiErrors.notFound('Skill');
    }

    // Delete skill (cascades to userSkills)
    await prisma.skill.delete({
      where: { id: skillId },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete skill:', error);
    return ApiErrors.internal('Failed to delete skill');
  }
}
