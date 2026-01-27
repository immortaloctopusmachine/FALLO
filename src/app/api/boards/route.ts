import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/boards - Get all boards for current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const boards = await prisma.board.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
        archivedAt: null,
      },
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
        lists: {
          orderBy: { position: 'asc' },
          include: {
            _count: {
              select: { cards: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: boards });
  } catch (error) {
    console.error('Failed to fetch boards:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch boards' } },
      { status: 500 }
    );
  }
}

// POST /api/boards - Create a new board
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Board name is required' } },
        { status: 400 }
      );
    }

    const board = await prisma.board.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        settings: {},
        members: {
          create: {
            userId: session.user.id,
            role: 'ADMIN',
          },
        },
        lists: {
          create: [
            { name: 'To Do', position: 0 },
            { name: 'In Progress', position: 1 },
            { name: 'Done', position: 2 },
          ],
        },
      },
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
        lists: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, data: board }, { status: 201 });
  } catch (error) {
    console.error('Failed to create board:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create board' } },
      { status: 500 }
    );
  }
}
