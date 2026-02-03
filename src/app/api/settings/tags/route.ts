import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/settings/tags - Get all tags
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const tags = await prisma.tag.findMany({
      where: {
        studioId: null, // Global tags only for now
      },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { cardTags: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: tags });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tags' } },
      { status: 500 }
    );
  }
}

// POST /api/settings/tags - Create a new tag
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
    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Tag name is required' } },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.tag.findFirst({
      where: {
        studioId: null,
        name: name.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'A tag with this name already exists' } },
        { status: 400 }
      );
    }

    // Get the highest position
    const maxPosition = await prisma.tag.aggregate({
      where: { studioId: null },
      _max: { position: true },
    });

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        position: (maxPosition._max.position ?? -1) + 1,
        studioId: null,
      },
    });

    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  } catch (error) {
    console.error('Failed to create tag:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create tag' } },
      { status: 500 }
    );
  }
}
