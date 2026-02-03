import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/settings/skills/[skillId] - Update a skill
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ skillId: string }> }
) {
  try {
    const session = await auth();
    const { skillId } = await params;

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

    // Check if skill exists
    const existingSkill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!existingSkill) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Skill not found' } },
        { status: 404 }
      );
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

    return NextResponse.json({ success: true, data: skill });
  } catch (error) {
    console.error('Failed to update skill:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update skill' } },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/skills/[skillId] - Delete a skill
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ skillId: string }> }
) {
  try {
    const session = await auth();
    const { skillId } = await params;

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

    // Check if skill exists
    const existingSkill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!existingSkill) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Skill not found' } },
        { status: 404 }
      );
    }

    // Delete skill (cascades to userSkills)
    await prisma.skill.delete({
      where: { id: skillId },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to delete skill:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete skill' } },
      { status: 500 }
    );
  }
}
