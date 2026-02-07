import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/users/[userId]/skills - Get user's skills
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const { userId } = await params;

    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: true,
      },
      orderBy: {
        skill: { position: 'asc' },
      },
    });

    return apiSuccess(userSkills);
  } catch (error) {
    console.error('Failed to fetch user skills:', error);
    return ApiErrors.internal('Failed to fetch user skills');
  }
}

// POST /api/users/[userId]/skills - Add a skill to user
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { userId } = await params;

    const adminResult = await requireAdmin(session.user.id);
    if (adminResult.response) return adminResult.response;

    const body = await request.json();
    const { skillId } = body;

    if (!skillId) {
      return ApiErrors.validation('Skill ID is required');
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return ApiErrors.notFound('User');
    }

    // Check if skill exists
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill) {
      return ApiErrors.notFound('Skill');
    }

    // Check if already has skill
    const existingUserSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: { userId, skillId },
      },
    });

    if (existingUserSkill) {
      return ApiErrors.validation('User already has this skill');
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

    return apiSuccess(userSkill, 201);
  } catch (error) {
    console.error('Failed to add user skill:', error);
    return ApiErrors.internal('Failed to add user skill');
  }
}

// DELETE /api/users/[userId]/skills - Remove a skill from user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { userId } = await params;

    const adminResult = await requireAdmin(session.user.id);
    if (adminResult.response) return adminResult.response;

    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get('skillId');

    if (!skillId) {
      return ApiErrors.validation('Skill ID is required');
    }

    // Check if user skill exists
    const existingUserSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: { userId, skillId },
      },
    });

    if (!existingUserSkill) {
      return ApiErrors.notFound('User skill');
    }

    await prisma.userSkill.delete({
      where: {
        userId_skillId: { userId, skillId },
      },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to remove user skill:', error);
    return ApiErrors.internal('Failed to remove user skill');
  }
}
