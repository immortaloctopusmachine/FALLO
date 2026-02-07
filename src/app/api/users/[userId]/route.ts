import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/users/[userId] - Get a user profile
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        permission: true,
        createdAt: true,
        teamMembers: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                color: true,
                studio: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        userSkills: {
          include: {
            skill: true,
          },
        },
        userCompanyRoles: {
          include: {
            companyRole: true,
          },
        },
        boardMembers: {
          include: {
            board: {
              select: {
                id: true,
                name: true,
                archivedAt: true,
              },
            },
          },
        },
        _count: {
          select: {
            assignedCards: true,
            comments: true,
            activities: true,
          },
        },
      },
    });

    if (!user) {
      return ApiErrors.notFound('User');
    }

    return apiSuccess(user);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return ApiErrors.internal('Failed to fetch user');
  }
}

// PATCH /api/users/[userId] - Update a user
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { userId } = await params;

    // Users can only update their own profile, unless admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });

    const isAdmin = currentUser?.permission === 'ADMIN' || currentUser?.permission === 'SUPER_ADMIN';
    const isSuperAdmin = currentUser?.permission === 'SUPER_ADMIN';
    const isSelf = session.user.id === userId;

    if (!isAdmin && !isSelf) {
      return ApiErrors.forbidden('Access denied');
    }

    const body = await request.json();
    const { name, image, permission, teamIds, skillIds, companyRoleIds } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return ApiErrors.notFound('User');
    }

    // Validate permission if provided
    if (permission !== undefined) {
      const validRoles = ['VIEWER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN'];
      if (!validRoles.includes(permission)) {
        return ApiErrors.validation('Invalid permission');
      }
      // Only Super Admins can assign SUPER_ADMIN permission
      if (permission === 'SUPER_ADMIN' && !isSuperAdmin) {
        return ApiErrors.forbidden('Only Super Admins can assign Super Admin permission');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name?.trim() || null;
    if (image !== undefined) updateData.image = image || null;
    // Only Super Admins can change permissions
    if (permission !== undefined && isSuperAdmin) updateData.permission = permission;

    // Update the user
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Update team memberships if provided (Super Admin only)
    if (teamIds !== undefined && isSuperAdmin) {
      // Remove all existing team memberships
      await prisma.teamMember.deleteMany({
        where: { userId },
      });

      // Add new team memberships
      if (Array.isArray(teamIds) && teamIds.length > 0) {
        await prisma.teamMember.createMany({
          data: teamIds.map((teamId: string) => ({
            userId,
            teamId,
            permission: 'MEMBER',
          })),
          skipDuplicates: true,
        });
      }
    }

    // Update skills if provided (Super Admin only)
    if (skillIds !== undefined && isSuperAdmin) {
      // Remove all existing skills
      await prisma.userSkill.deleteMany({
        where: { userId },
      });

      // Add new skills
      if (Array.isArray(skillIds) && skillIds.length > 0) {
        await prisma.userSkill.createMany({
          data: skillIds.map((skillId: string) => ({
            userId,
            skillId,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Update company roles if provided (Super Admin only)
    if (companyRoleIds !== undefined && isSuperAdmin) {
      // Remove all existing company roles
      await prisma.userCompanyRole.deleteMany({
        where: { userId },
      });

      // Add new company roles
      if (Array.isArray(companyRoleIds) && companyRoleIds.length > 0) {
        await prisma.userCompanyRole.createMany({
          data: companyRoleIds.map((companyRoleId: string) => ({
            userId,
            companyRoleId,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Fetch the complete updated user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        permission: true,
        teamMembers: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        userSkills: {
          include: {
            skill: true,
          },
        },
        userCompanyRoles: {
          include: {
            companyRole: true,
          },
        },
      },
    });

    return apiSuccess(user);
  } catch (error) {
    console.error('Failed to update user:', error);
    return ApiErrors.internal('Failed to update user');
  }
}

// DELETE /api/users/[userId] - Soft delete a user (Super Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { userId } = await params;

    // Only Super Admins can delete users
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });

    if (currentUser?.permission !== 'SUPER_ADMIN') {
      return ApiErrors.forbidden('Super Admin access required');
    }

    // Prevent deleting yourself
    if (session.user.id === userId) {
      return ApiErrors.forbidden('Cannot delete your own account');
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });

    if (!existingUser) {
      return ApiErrors.notFound('User');
    }

    if (existingUser.deletedAt) {
      return ApiErrors.validation('User has already been deleted');
    }

    // Soft delete the user (set deletedAt timestamp)
    // This preserves user data on boards and timelines
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    // Remove from teams (they shouldn't appear in team lists anymore)
    await prisma.teamMember.deleteMany({
      where: { userId },
    });

    // Remove skills (no longer relevant for a deleted user)
    await prisma.userSkill.deleteMany({
      where: { userId },
    });

    // Remove company roles
    await prisma.userCompanyRole.deleteMany({
      where: { userId },
    });

    // Clear sessions so they can't log in
    await prisma.session.deleteMany({
      where: { userId },
    });

    // Note: We intentionally keep:
    // - boardMembers (they stay on boards, shown as deleted)
    // - assignedCards (task assignments preserved)
    // - comments (their comments remain)
    // - activities (activity history preserved)
    // - timelineAssignments (timeline data preserved)

    return apiSuccess({ deletedUserId: userId });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return ApiErrors.internal('Failed to delete user');
  }
}
