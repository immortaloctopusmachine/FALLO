import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/settings/block-types - Get all block types
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const blockTypes = await prisma.blockType.findMany({
      where: {
        studioId: null, // Global block types only for now
      },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { blocks: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: blockTypes });
  } catch (error) {
    console.error('Failed to fetch block types:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch block types' } },
      { status: 500 }
    );
  }
}

// POST /api/settings/block-types - Create a new block type
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
    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Block type name is required' } },
        { status: 400 }
      );
    }

    if (!color || typeof color !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Block type color is required' } },
        { status: 400 }
      );
    }

    // Get the highest position
    const maxPosition = await prisma.blockType.aggregate({
      where: { studioId: null },
      _max: { position: true },
    });

    const blockType = await prisma.blockType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color,
        position: (maxPosition._max.position ?? -1) + 1,
        isDefault: false,
        studioId: null,
      },
    });

    return NextResponse.json({ success: true, data: blockType }, { status: 201 });
  } catch (error) {
    console.error('Failed to create block type:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create block type' } },
      { status: 500 }
    );
  }
}
