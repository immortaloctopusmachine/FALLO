import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// PATCH /api/settings/roles/[roleId] - Update a company role
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { roleId } = await params;
    const body = await request.json();
    const { name, description, color, position } = body;

    // Check if role exists
    const existingRole = await prisma.companyRole.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      return ApiErrors.notFound('Company role');
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (color !== undefined) updateData.color = color || null;
    if (position !== undefined) updateData.position = position;

    const role = await prisma.companyRole.update({
      where: { id: roleId },
      data: updateData,
    });

    return apiSuccess(role);
  } catch (error) {
    console.error('Failed to update company role:', error);
    return ApiErrors.internal('Failed to update company role');
  }
}

// DELETE /api/settings/roles/[roleId] - Delete a company role
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { roleId } = await params;

    // Check if role exists
    const existingRole = await prisma.companyRole.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      return ApiErrors.notFound('Company role');
    }

    // Delete role (cascades to userCompanyRoles)
    await prisma.companyRole.delete({
      where: { id: roleId },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete company role:', error);
    return ApiErrors.internal('Failed to delete company role');
  }
}
