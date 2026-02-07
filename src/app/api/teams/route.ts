import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/teams - Get all teams
export async function GET(request: Request) {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');

    const teams = await prisma.team.findMany({
      where: {
        archivedAt: null,
        ...(studioId ? { studioId } : {}),
      },
      orderBy: [{ studioId: 'asc' }, { position: 'asc' }],
      include: {
        studio: {
          select: { id: true, name: true, color: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            boards: { where: { archivedAt: null } },
            members: true,
          },
        },
      },
    });

    return apiSuccess(teams);
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return ApiErrors.internal('Failed to fetch teams');
  }
}

// POST /api/teams - Create a new team
export async function POST(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const { name, description, image, color, studioId } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrors.validation('Team name is required');
    }

    if (!color || typeof color !== 'string') {
      return ApiErrors.validation('Team color is required');
    }

    // Get the highest position for teams in this studio
    const maxPosition = await prisma.team.aggregate({
      where: { studioId: studioId || null },
      _max: { position: true },
    });

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        image: image || null,
        color,
        position: (maxPosition._max.position ?? -1) + 1,
        studioId: studioId || null,
      },
      include: {
        studio: {
          select: { id: true, name: true, color: true },
        },
        _count: {
          select: { boards: true, members: true },
        },
      },
    });

    return apiSuccess(team, 201);
  } catch (error) {
    console.error('Failed to create team:', error);
    return ApiErrors.internal('Failed to create team');
  }
}
