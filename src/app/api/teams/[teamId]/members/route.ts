import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/teams/[teamId]/members - Get team members
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const { teamId } = await params;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');

    if (scope === 'ids') {
      const members = await prisma.teamMember.findMany({
        where: { teamId },
        orderBy: { joinedAt: 'asc' },
        select: {
          userId: true,
        },
      });

      return apiSuccess(members);
    }

    if (scope === 'picker') {
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
              userCompanyRoles: {
                include: {
                  companyRole: {
                    select: {
                      id: true,
                      name: true,
                      color: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return apiSuccess(members);
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
            permission: true,
            userSkills: {
              include: {
                skill: true,
              },
            },
            userCompanyRoles: {
              include: {
                companyRole: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return apiSuccess(members);
  } catch (error) {
    console.error('Failed to fetch team members:', error);
    return ApiErrors.internal('Failed to fetch team members');
  }
}

// POST /api/teams/[teamId]/members - Add a member to team
export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { teamId } = await params;
    const body = await request.json();
    const { userId, permission = 'MEMBER', title } = body;

    if (!userId) {
      return ApiErrors.validation('User ID is required');
    }

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team || team.archivedAt) {
      return ApiErrors.notFound('Team');
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return ApiErrors.notFound('User');
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: { userId, teamId },
      },
    });

    if (existingMember) {
      return ApiErrors.validation('User is already a team member');
    }

    // Add member to team
    const member = await prisma.teamMember.create({
      data: {
        userId,
        teamId,
        permission,
        title: title?.trim() || null,
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

    // Also add member to all boards in this team
    const teamBoards = await prisma.board.findMany({
      where: { teamId, archivedAt: null },
      select: { id: true },
    });

    if (teamBoards.length > 0) {
      await prisma.boardMember.createMany({
        data: teamBoards.map((board) => ({
          userId,
          boardId: board.id,
          permission,
        })),
        skipDuplicates: true,
      });
    }

    return apiSuccess(member, 201);
  } catch (error) {
    console.error('Failed to add team member:', error);
    return ApiErrors.internal('Failed to add team member');
  }
}

// DELETE /api/teams/[teamId]/members - Remove a member from team
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { teamId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return ApiErrors.validation('User ID is required');
    }

    // Check if member exists
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: { userId, teamId },
      },
    });

    if (!existingMember) {
      return ApiErrors.notFound('Team member');
    }

    // Remove member from team
    await prisma.teamMember.delete({
      where: {
        userId_teamId: { userId, teamId },
      },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to remove team member:', error);
    return ApiErrors.internal('Failed to remove team member');
  }
}
