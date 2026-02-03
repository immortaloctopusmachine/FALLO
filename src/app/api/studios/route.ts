import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/studios - Get all studios
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const studios = await prisma.studio.findMany({
      where: {
        archivedAt: null,
      },
      orderBy: { name: 'asc' },
      include: {
        teams: {
          where: { archivedAt: null },
          select: { id: true },
        },
        _count: {
          select: {
            teams: { where: { archivedAt: null } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: studios });
  } catch (error) {
    console.error('Failed to fetch studios:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch studios' } },
      { status: 500 }
    );
  }
}

// POST /api/studios - Create a new studio
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
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, image, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Studio name is required' } },
        { status: 400 }
      );
    }

    const studio = await prisma.studio.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        image: image || null,
        color: color || null,
      },
      include: {
        _count: {
          select: { teams: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: studio }, { status: 201 });
  } catch (error) {
    console.error('Failed to create studio:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create studio' } },
      { status: 500 }
    );
  }
}
