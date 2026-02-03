import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/settings/block-types/[blockTypeId] - Update a block type
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ blockTypeId: string }> }
) {
  try {
    const session = await auth();
    const { blockTypeId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, color, position } = body;

    // Check if block type exists
    const existingBlockType = await prisma.blockType.findUnique({
      where: { id: blockTypeId },
    });

    if (!existingBlockType) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Block type not found' } },
        { status: 404 }
      );
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

    return NextResponse.json({ success: true, data: blockType });
  } catch (error) {
    console.error('Failed to update block type:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update block type' } },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/block-types/[blockTypeId] - Delete a block type
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ blockTypeId: string }> }
) {
  try {
    const session = await auth();
    const { blockTypeId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Check if block type exists
    const existingBlockType = await prisma.blockType.findUnique({
      where: { id: blockTypeId },
      include: {
        _count: { select: { blocks: true } },
      },
    });

    if (!existingBlockType) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Block type not found' } },
        { status: 404 }
      );
    }

    // Prevent deletion if block type is in use
    if (existingBlockType._count.blocks > 0) {
      return NextResponse.json(
        { success: false, error: { code: 'IN_USE', message: 'Cannot delete block type that is in use' } },
        { status: 400 }
      );
    }

    // Prevent deletion of default block types
    if (existingBlockType.isDefault) {
      return NextResponse.json(
        { success: false, error: { code: 'PROTECTED', message: 'Cannot delete default block types' } },
        { status: 400 }
      );
    }

    await prisma.blockType.delete({
      where: { id: blockTypeId },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to delete block type:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete block type' } },
      { status: 500 }
    );
  }
}
