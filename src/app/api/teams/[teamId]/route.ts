import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/teams/[teamId] - Get a team with details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const { teamId } = await params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        studio: {
          select: { id: true, name: true, color: true },
        },
        members: {
          orderBy: { joinedAt: 'asc' },
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
        },
        boards: {
          where: { archivedAt: null },
          orderBy: { updatedAt: 'desc' },
          include: {
            _count: {
              select: { lists: true, members: true },
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

    if (!team) {
      return ApiErrors.notFound('Team');
    }

    return apiSuccess(team);
  } catch (error) {
    console.error('Failed to fetch team:', error);
    return ApiErrors.internal('Failed to fetch team');
  }
}

// PATCH /api/teams/[teamId] - Update a team
export async function PATCH(
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
    const { name, description, image, color, position, studioId } = body;

    // Check if team exists
    const existingTeam = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!existingTeam) {
      return ApiErrors.notFound('Team');
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (image !== undefined) updateData.image = image || null;
    if (color !== undefined) updateData.color = color;
    if (position !== undefined) updateData.position = position;
    if (studioId !== undefined) updateData.studioId = studioId || null;

    const team = await prisma.team.update({
      where: { id: teamId },
      data: updateData,
      include: {
        studio: {
          select: { id: true, name: true, color: true },
        },
        _count: {
          select: { boards: { where: { archivedAt: null } }, members: true },
        },
      },
    });

    return apiSuccess(team);
  } catch (error) {
    console.error('Failed to update team:', error);
    return ApiErrors.internal('Failed to update team');
  }
}

// DELETE /api/teams/[teamId] - Archive a team
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

    // Check if team exists
    const existingTeam = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!existingTeam) {
      return ApiErrors.notFound('Team');
    }

    // Soft delete (archive) the team
    await prisma.team.update({
      where: { id: teamId },
      data: { archivedAt: new Date() },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to archive team:', error);
    return ApiErrors.internal('Failed to archive team');
  }
}
