import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/settings/tags/[tagId] - Update a tag
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const session = await auth();
    const { tagId } = await params;

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

    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!existingTag) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Tag not found' } },
        { status: 404 }
      );
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
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'A tag with this name already exists' } },
          { status: 400 }
        );
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

    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    console.error('Failed to update tag:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update tag' } },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/tags/[tagId] - Delete a tag
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const session = await auth();
    const { tagId } = await params;

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

    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!existingTag) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Tag not found' } },
        { status: 404 }
      );
    }

    // Delete tag (cascades to cardTags)
    await prisma.tag.delete({
      where: { id: tagId },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete tag' } },
      { status: 500 }
    );
  }
}
