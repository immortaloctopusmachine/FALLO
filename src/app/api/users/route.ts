import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import {
  requireAuth,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/users - Get all users (admin only)
export async function GET() {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const users = await prisma.user.findMany({
      where: { deletedAt: null }, // Exclude soft-deleted users
      orderBy: { name: 'asc' },
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
    const { email, password, name, permission, teamIds, skillIds, companyRoleIds } = body;

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

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || null,
        passwordHash,
        permission: permission || 'MEMBER',
      },
      select: {
        id: true,
        email: true,
        name: true,
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
