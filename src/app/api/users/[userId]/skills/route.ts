import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/users/[userId]/skills - Get user's skills
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const { userId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: true,
      },
      orderBy: {
        skill: { position: 'asc' },
      },
    });

    return NextResponse.json({ success: true, data: userSkills });
  } catch (error) {
    console.error('Failed to fetch user skills:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user skills' } },
      { status: 500 }
    );
  }
}

// POST /api/users/[userId]/skills - Add a skill to user
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const { userId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });

    if (currentUser?.permission !== 'ADMIN' && currentUser?.permission !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { skillId } = body;

    if (!skillId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Skill ID is required' } },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Check if skill exists
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Skill not found' } },
        { status: 404 }
      );
    }

    // Check if already has skill
    const existingUserSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: { userId, skillId },
      },
    });

    if (existingUserSkill) {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_EXISTS', message: 'User already has this skill' } },
        { status: 400 }
      );
    }

    const userSkill = await prisma.userSkill.create({
      data: {
        userId,
        skillId,
      },
      include: {
        skill: true,
      },
    });

    return NextResponse.json({ success: true, data: userSkill }, { status: 201 });
  } catch (error) {
    console.error('Failed to add user skill:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to add user skill' } },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[userId]/skills - Remove a skill from user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const { userId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });

    if (currentUser?.permission !== 'ADMIN' && currentUser?.permission !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get('skillId');

    if (!skillId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Skill ID is required' } },
        { status: 400 }
      );
    }

    // Check if user skill exists
    const existingUserSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: { userId, skillId },
      },
    });

    if (!existingUserSkill) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User skill not found' } },
        { status: 404 }
      );
    }

    await prisma.userSkill.delete({
      where: {
        userId_skillId: { userId, skillId },
      },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to remove user skill:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove user skill' } },
      { status: 500 }
    );
  }
}
