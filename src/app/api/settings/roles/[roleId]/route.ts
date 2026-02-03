import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/settings/roles/[roleId] - Update a company role
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const session = await auth();
    const { roleId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });

    if (user?.permission !== 'ADMIN' && user?.permission !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, color, position } = body;

    // Check if role exists
    const existingRole = await prisma.companyRole.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Company role not found' } },
        { status: 404 }
      );
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

    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    console.error('Failed to update company role:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update company role' } },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/roles/[roleId] - Delete a company role
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const session = await auth();
    const { roleId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });

    if (user?.permission !== 'ADMIN' && user?.permission !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Check if role exists
    const existingRole = await prisma.companyRole.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Company role not found' } },
        { status: 404 }
      );
    }

    // Delete role (cascades to userCompanyRoles)
    await prisma.companyRole.delete({
      where: { id: roleId },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to delete company role:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete company role' } },
      { status: 500 }
    );
  }
}
