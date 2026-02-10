import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { findSlackUserByName, getSlackUserProfile, isSlackConfigured } from '@/lib/slack';
import {
  requireAuth,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/users - Get all users
// ?include=metadata — also return teams, skills, companyRoles for the users page
export async function GET(request: Request) {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const includeMetadata = searchParams.get('include') === 'metadata';

    const usersPromise = prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        slackUserId: true,
        slackDisplayName: true,
        slackAvatarUrl: true,
        permission: true,
        createdAt: true,
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
        _count: {
          select: {
            assignedCards: true,
            boardMembers: true,
          },
        },
      },
    });

    if (includeMetadata) {
      const [users, teams, skills, companyRoles] = await Promise.all([
        usersPromise,
        prisma.team.findMany({
          where: { archivedAt: null },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, color: true },
        }),
        prisma.skill.findMany({
          where: { studioId: null },
          orderBy: { position: 'asc' },
          select: { id: true, name: true, color: true },
        }),
        prisma.companyRole.findMany({
          where: { studioId: null },
          orderBy: { position: 'asc' },
          select: { id: true, name: true, color: true },
        }),
      ]);
      return apiSuccess({ users, teams, skills, companyRoles });
    }

    const users = await usersPromise;
    return apiSuccess(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return ApiErrors.internal('Failed to fetch users');
  }
}

// POST /api/users - Create a new user (Super Admin only)
export async function POST(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    // Only Super Admins can create users
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });

    if (currentUser?.permission !== 'SUPER_ADMIN') {
      return ApiErrors.forbidden('Super Admin access required');
    }

    const body = await request.json();
    const { email, password, name, permission, teamIds, skillIds, companyRoleIds, slackUserId } = body;

    // Validate required fields
    if (!email || !password) {
      return ApiErrors.validation('Email and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ApiErrors.validation('Invalid email format');
    }

    // Validate password strength (min 8 characters)
    if (password.length < 8) {
      return ApiErrors.validation('Password must be at least 8 characters');
    }

    // Validate permission if provided
    const validRoles = ['VIEWER', 'MEMBER', 'ADMIN', 'SUPER_ADMIN'];
    if (permission && !validRoles.includes(permission)) {
      return ApiErrors.validation('Invalid permission');
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return ApiErrors.conflict('A user with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    let resolvedSlackUserId: string | null = null;
    let resolvedSlackDisplayName: string | null = null;
    let resolvedSlackAvatarUrl: string | null = null;

    if (isSlackConfigured()) {
      if (typeof slackUserId === 'string' && slackUserId.trim()) {
        const slackUser = await getSlackUserProfile(slackUserId.trim());
        if (!slackUser) {
          return ApiErrors.validation('Selected Slack user was not found');
        }
        resolvedSlackUserId = slackUser.id;
        resolvedSlackDisplayName = slackUser.displayName || slackUser.realName || null;
        resolvedSlackAvatarUrl = slackUser.image192;
      } else if (typeof name === 'string' && name.trim()) {
        // Best-effort behind-the-scenes link by name when not explicitly chosen
        const match = await findSlackUserByName(name.trim());
        if (match) {
          resolvedSlackUserId = match.id;
          resolvedSlackDisplayName = match.displayName || match.realName || null;
          resolvedSlackAvatarUrl = match.image192;
        }
      }
    }

    if (resolvedSlackUserId) {
      const existingSlackLink = await prisma.user.findFirst({
        where: { slackUserId: resolvedSlackUserId },
        select: { id: true, email: true },
      });
      if (existingSlackLink) {
        return ApiErrors.conflict(
          `Slack user is already linked to ${existingSlackLink.email}`
        );
      }
    }

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || null,
        image: resolvedSlackAvatarUrl || null,
        slackUserId: resolvedSlackUserId,
        slackDisplayName: resolvedSlackDisplayName,
        slackAvatarUrl: resolvedSlackAvatarUrl,
        passwordHash,
        permission: permission || 'MEMBER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        slackUserId: true,
        slackDisplayName: true,
        slackAvatarUrl: true,
        permission: true,
        createdAt: true,
      },
    });

    // Add team memberships if provided
    if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
      await prisma.teamMember.createMany({
        data: teamIds.map((teamId: string) => ({
          userId: newUser.id,
          teamId,
          permission: 'MEMBER',
        })),
        skipDuplicates: true,
      });
    }

    // Add skills if provided
    if (skillIds && Array.isArray(skillIds) && skillIds.length > 0) {
      await prisma.userSkill.createMany({
        data: skillIds.map((skillId: string) => ({
          userId: newUser.id,
          skillId,
        })),
        skipDuplicates: true,
      });
    }

    // Add company roles if provided
    if (companyRoleIds && Array.isArray(companyRoleIds) && companyRoleIds.length > 0) {
      await prisma.userCompanyRole.createMany({
        data: companyRoleIds.map((companyRoleId: string) => ({
          userId: newUser.id,
          companyRoleId,
        })),
        skipDuplicates: true,
      });
    }

    // Fetch the complete user with relations
    const completeUser = await prisma.user.findUnique({
      where: { id: newUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        slackUserId: true,
        slackDisplayName: true,
        slackAvatarUrl: true,
        permission: true,
        createdAt: true,
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

    return apiSuccess(completeUser, 201);
  } catch (error) {
    console.error('Failed to create user:', error);
    return ApiErrors.internal('Failed to create user');
  }
}
