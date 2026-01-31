import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { UserRole } from '@/types';

interface RouteContext {
  params: Promise<{ boardId: string }>;
}

// GET /api/boards/[boardId]/members
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { boardId } = await context.params;

    // Verify membership
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this board' } },
        { status: 403 }
      );
    }

    const members = await prisma.boardMember.findMany({
      where: { boardId },
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
      orderBy: { joinedAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch members' } },
      { status: 500 }
    );
  }
}

// POST /api/boards/[boardId]/members - Add a member
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { boardId } = await context.params;

    // Check if user is admin of this board
    const adminMembership = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
    });

    if (!adminMembership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only admins can add members' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role = 'MEMBER' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email is required' } },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMembership = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: user.id,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_EXISTS', message: 'User is already a member' } },
        { status: 409 }
      );
    }

    // Add member
    const member = await prisma.boardMember.create({
      data: {
        boardId,
        userId: user.id,
        role: role as UserRole,
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

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error) {
    console.error('Failed to add member:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to add member' } },
      { status: 500 }
    );
  }
}

// PATCH /api/boards/[boardId]/members - Update member role
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { boardId } = await context.params;

    // Check if user is admin of this board
    const adminMembership = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
    });

    if (!adminMembership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only admins can update member roles' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Member ID and role are required' } },
        { status: 400 }
      );
    }

    // Can't change your own role (to prevent locking yourself out)
    const memberToUpdate = await prisma.boardMember.findUnique({
      where: { id: memberId },
    });

    if (memberToUpdate?.userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot change your own role' } },
        { status: 403 }
      );
    }

    const member = await prisma.boardMember.update({
      where: { id: memberId },
      data: { role: role as UserRole },
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

    return NextResponse.json({ success: true, data: member });
  } catch (error) {
    console.error('Failed to update member:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update member' } },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[boardId]/members - Remove a member
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { boardId } = await context.params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Member ID is required' } },
        { status: 400 }
      );
    }

    // Get the member to be removed
    const memberToRemove = await prisma.boardMember.findUnique({
      where: { id: memberId },
    });

    if (!memberToRemove || memberToRemove.boardId !== boardId) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } },
        { status: 404 }
      );
    }

    // Check if user is admin OR removing themselves
    const isSelf = memberToRemove.userId === session.user.id;

    if (!isSelf) {
      const adminMembership = await prisma.boardMember.findFirst({
        where: {
          boardId,
          userId: session.user.id,
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        },
      });

      if (!adminMembership) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Only admins can remove other members' } },
          { status: 403 }
        );
      }
    }

    // Check if this would leave the board with no admins
    if (memberToRemove.role === 'ADMIN' || memberToRemove.role === 'SUPER_ADMIN') {
      const adminCount = await prisma.boardMember.count({
        where: {
          boardId,
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Cannot remove the last admin' } },
          { status: 403 }
        );
      }
    }

    await prisma.boardMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to remove member:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' } },
      { status: 500 }
    );
  }
}
