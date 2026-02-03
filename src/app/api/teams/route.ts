import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/teams - Get all teams
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

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

    return NextResponse.json({ success: true, data: teams });
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch teams' } },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create a new team
export async function POST(request: Request) {
  try {
    const session = await auth();

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
    const { name, description, image, color, studioId } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Team name is required' } },
        { status: 400 }
      );
    }

    if (!color || typeof color !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Team color is required' } },
        { status: 400 }
      );
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

    return NextResponse.json({ success: true, data: team }, { status: 201 });
  } catch (error) {
    console.error('Failed to create team:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create team' } },
      { status: 500 }
    );
  }
}
