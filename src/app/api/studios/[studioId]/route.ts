import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/studios/[studioId] - Get a studio with details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ studioId: string }> }
) {
  try {
    const session = await auth();
    const { studioId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

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
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Studio not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: studio });
  } catch (error) {
    console.error('Failed to fetch studio:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch studio' } },
      { status: 500 }
    );
  }
}

// PATCH /api/studios/[studioId] - Update a studio
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ studioId: string }> }
) {
  try {
    const session = await auth();
    const { studioId } = await params;

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
    const { name, description, image, color } = body;

    // Check if studio exists
    const existingStudio = await prisma.studio.findUnique({
      where: { id: studioId },
    });

    if (!existingStudio) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Studio not found' } },
        { status: 404 }
      );
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

    return NextResponse.json({ success: true, data: studio });
  } catch (error) {
    console.error('Failed to update studio:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update studio' } },
      { status: 500 }
    );
  }
}

// DELETE /api/studios/[studioId] - Archive a studio
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ studioId: string }> }
) {
  try {
    const session = await auth();
    const { studioId } = await params;

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

    // Check if studio exists
    const existingStudio = await prisma.studio.findUnique({
      where: { id: studioId },
    });

    if (!existingStudio) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Studio not found' } },
        { status: 404 }
      );
    }

    // Soft delete (archive) the studio
    await prisma.studio.update({
      where: { id: studioId },
      data: { archivedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Failed to archive studio:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to archive studio' } },
      { status: 500 }
    );
  }
}
