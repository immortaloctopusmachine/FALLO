import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/studios/[studioId] - Get a studio with details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ studioId: string }> }
) {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const { studioId } = await params;

    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      include: {
        teams: {
          where: { archivedAt: null },
          orderBy: { position: 'asc' },
          include: {
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
        },
        _count: {
          select: {
            teams: { where: { archivedAt: null } },
          },
        },
      },
    });

    if (!studio) {
      return ApiErrors.notFound('Studio');
    }

    return apiSuccess(studio);
  } catch (error) {
    console.error('Failed to fetch studio:', error);
    return ApiErrors.internal('Failed to fetch studio');
  }
}

// PATCH /api/studios/[studioId] - Update a studio
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ studioId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { studioId } = await params;
    const body = await request.json();
    const { name, description, image, color } = body;

    // Check if studio exists
    const existingStudio = await prisma.studio.findUnique({
      where: { id: studioId },
    });

    if (!existingStudio) {
      return ApiErrors.notFound('Studio');
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (image !== undefined) updateData.image = image || null;
    if (color !== undefined) updateData.color = color || null;

    const studio = await prisma.studio.update({
      where: { id: studioId },
      data: updateData,
      include: {
        _count: {
          select: { teams: { where: { archivedAt: null } } },
        },
      },
    });

    return apiSuccess(studio);
  } catch (error) {
    console.error('Failed to update studio:', error);
    return ApiErrors.internal('Failed to update studio');
  }
}

// DELETE /api/studios/[studioId] - Archive a studio
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ studioId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { studioId } = await params;

    // Check if studio exists
    const existingStudio = await prisma.studio.findUnique({
      where: { id: studioId },
    });

    if (!existingStudio) {
      return ApiErrors.notFound('Studio');
    }

    // Soft delete (archive) the studio
    await prisma.studio.update({
      where: { id: studioId },
      data: { archivedAt: new Date() },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to archive studio:', error);
    return ApiErrors.internal('Failed to archive studio');
  }
}
