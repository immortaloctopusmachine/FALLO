import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/settings/skills - Get all skills
export async function GET() {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const skills = await prisma.skill.findMany({
      where: {
        studioId: null, // Global skills only for now
      },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { userSkills: true },
        },
      },
    });

    return apiSuccess(skills);
  } catch (error) {
    console.error('Failed to fetch skills:', error);
    return ApiErrors.internal('Failed to fetch skills');
  }
}

// POST /api/settings/skills - Create a new skill
export async function POST(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrors.validation('Skill name is required');
    }

    // Get the highest position
    const maxPosition = await prisma.skill.aggregate({
      where: { studioId: null },
      _max: { position: true },
    });

    const skill = await prisma.skill.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        position: (maxPosition._max.position ?? -1) + 1,
        studioId: null,
      },
    });

    return apiSuccess(skill, 201);
  } catch (error) {
    console.error('Failed to create skill:', error);
    return ApiErrors.internal('Failed to create skill');
  }
}
