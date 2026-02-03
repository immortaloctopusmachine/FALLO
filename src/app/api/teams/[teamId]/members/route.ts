import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/teams/[teamId]/members - Get team members
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await auth();
    const { teamId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { joinedAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            userSkills: {
              include: {
                skill: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    console.error('Failed to fetch team members:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch team members' } },
      { status: 500 }
    );
  }
}

// POST /api/teams/[teamId]/members - Add a member to team
export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await auth();
    const { teamId } = await params;

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
    const { userId, role = 'MEMBER', title } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'User ID is required' } },
        { status: 400 }
      );
    }

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team || team.archivedAt) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Team not found' } },
        { status: 404 }
      );
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: { userId, teamId },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_EXISTS', message: 'User is already a team member' } },
        { status: 400 }
      );
    }

    // Add member to team
    const member = await prisma.teamMember.create({
      data: {
        userId,
        teamId,
        role,
        title: title?.trim() || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });

    // Also add member to all boards in this team
    const teamBoards = await prisma.board.findMany({
      where: { teamId, archivedAt: null },
      select: { id: true },
    });

    for (const board of teamBoards) {
      await prisma.boardMember.upsert({
        where: {
          userId_boardId: { userId, boardId: board.id },
        },
        update: {},
        create: {
          userId,
          boardId: board.id,
          role: role,
        },
      });
    }

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error) {
    console.error('Failed to add team member:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to add team member' } },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[teamId]/members - Remove a member from team
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await auth();
    const { teamId } = await params;

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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'User ID is required' } },
        { status: 400 }
      );
    }

    // Check if member exists
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: { userId, teamId },
      },
    });

    if (!existingMember) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Team member not found' } },
        { status: 404 }
      );
    }

    // Remove member from team
    await prisma.teamMember.delete({
      where: {
        userId_teamId: { userId, teamId },
      },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to remove team member:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove team member' } },
      { status: 500 }
    );
  }
}
