import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireBoardMember,
  requireBoardAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import type { UserPermission } from '@/types';

interface RouteContext {
  params: Promise<{ boardId: string }>;
}

// GET /api/boards/[boardId]/members
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await context.params;

    const { response: memberResponse } = await requireBoardMember(boardId, session.user.id);
    if (memberResponse) return memberResponse;

    const members = await prisma.boardMember.findMany({
      where: { boardId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            permission: true,
            deletedAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return apiSuccess(members);
  } catch (error) {
    console.error('Failed to fetch members:', error);
    return ApiErrors.internal('Failed to fetch members');
  }
}

// POST /api/boards/[boardId]/members - Add a member (accepts userId or email)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await context.params;

    const { response: adminResponse } = await requireBoardAdmin(boardId, session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const { userId, email, permission = 'MEMBER' } = body as {
      userId?: string;
      email?: string;
      permission?: UserPermission;
    };

    if (
      (typeof userId !== 'string' || userId.trim().length === 0) &&
      (typeof email !== 'string' || email.trim().length === 0)
    ) {
      return ApiErrors.validation('User ID or email is required');
    }

    // Find user by explicit ID first (faster for picker-driven UIs); email is fallback.
    const user = typeof userId === 'string' && userId.trim().length > 0
      ? await prisma.user.findUnique({
          where: { id: userId.trim() },
          select: { id: true, deletedAt: true },
        })
      : await prisma.user.findUnique({
          where: { email: email!.toLowerCase().trim() },
          select: { id: true, deletedAt: true },
        });

    if (!user || user.deletedAt) {
      return ApiErrors.notFound('User');
    }

    // Check if already a member
    const existingMembership = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: user.id,
      },
    });

    if (existingMembership) {
      return ApiErrors.conflict('User is already a member');
    }

    // Add member
    const member = await prisma.boardMember.create({
      data: {
        boardId,
        userId: user.id,
        permission: permission as UserPermission,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            permission: true,
          },
        },
      },
    });

    return apiSuccess(member, 201);
  } catch (error) {
    console.error('Failed to add member:', error);
    return ApiErrors.internal('Failed to add member');
  }
}

// PATCH /api/boards/[boardId]/members - Update member permission
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await context.params;

    const { response: adminResponse } = await requireBoardAdmin(boardId, session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const { memberId, permission } = body;

    if (!memberId || !permission) {
      return ApiErrors.validation('Member ID and permission are required');
    }

    // Can't change your own permission (to prevent locking yourself out)
    const memberToUpdate = await prisma.boardMember.findUnique({
      where: { id: memberId },
    });

    if (memberToUpdate?.userId === session.user.id) {
      return ApiErrors.forbidden('Cannot change your own permission');
    }

    const member = await prisma.boardMember.update({
      where: { id: memberId },
      data: { permission: permission as UserPermission },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            permission: true,
          },
        },
      },
    });

    return apiSuccess(member);
  } catch (error) {
    console.error('Failed to update member:', error);
    return ApiErrors.internal('Failed to update member');
  }
}

// DELETE /api/boards/[boardId]/members - Remove a member
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await context.params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return ApiErrors.validation('Member ID is required');
    }

    // Get the member to be removed
    const memberToRemove = await prisma.boardMember.findUnique({
      where: { id: memberId },
    });

    if (!memberToRemove || memberToRemove.boardId !== boardId) {
      return ApiErrors.notFound('Member');
    }

    // Check if user is admin OR removing themselves
    const isSelf = memberToRemove.userId === session.user.id;

    if (!isSelf) {
      const { response: adminResponse } = await requireBoardAdmin(boardId, session.user.id);
      if (adminResponse) return adminResponse;
    }

    // Check if this would leave the board with no admins
    if (memberToRemove.permission === 'ADMIN' || memberToRemove.permission === 'SUPER_ADMIN') {
      const adminCount = await prisma.boardMember.count({
        where: {
          boardId,
          permission: { in: ['ADMIN', 'SUPER_ADMIN'] },
        },
      });

      if (adminCount <= 1) {
        return ApiErrors.forbidden('Cannot remove the last admin');
      }
    }

    await prisma.boardMember.delete({
      where: { id: memberId },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to remove member:', error);
    return ApiErrors.internal('Failed to remove member');
  }
}
