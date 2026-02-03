import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/teams/[teamId] - Get a team with details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await auth();
    const { teamId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

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
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Team not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: team });
  } catch (error) {
    console.error('Failed to fetch team:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch team' } },
      { status: 500 }
    );
  }
}

// PATCH /api/teams/[teamId] - Update a team
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await auth();
    const { teamId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });

    if (user?.permission !== 'ADMIN' && user?.permission !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, image, color, position, studioId } = body;

    // Check if team exists
    const existingTeam = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!existingTeam) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Team not found' } },
        { status: 404 }
      );
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

    return NextResponse.json({ success: true, data: team });
  } catch (error) {
    console.error('Failed to update team:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update team' } },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[teamId] - Archive a team
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await auth();
    const { teamId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permission: true },
    });

    if (user?.permission !== 'ADMIN' && user?.permission !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Check if team exists
    const existingTeam = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!existingTeam) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Team not found' } },
        { status: 404 }
      );
    }

    // Soft delete (archive) the team
    await prisma.team.update({
      where: { id: teamId },
      data: { archivedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to archive team:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to archive team' } },
      { status: 500 }
    );
  }
}
