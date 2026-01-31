import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BOARD_TEMPLATES } from '@/lib/list-templates';
import type { BoardTemplateType, ListViewType, ListPhase } from '@/types';

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
    const { name, description, template = 'BLANK' } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Board name is required' } },
        { status: 400 }
      );
    }

    // Get template configuration
    const templateType = template as BoardTemplateType;
    const templateConfig = BOARD_TEMPLATES[templateType] || BOARD_TEMPLATES.BLANK;

    // Build list creation data from template
    const listsToCreate = [
      ...templateConfig.taskLists.map((list) => ({
        name: list.name,
        position: list.position,
        viewType: list.viewType as ListViewType,
        phase: list.phase as ListPhase | undefined,
        color: list.color,
        durationWeeks: list.durationWeeks,
      })),
      ...templateConfig.planningLists.map((list, idx) => ({
        name: list.name,
        position: templateConfig.taskLists.length + idx,
        viewType: list.viewType as ListViewType,
        phase: list.phase as ListPhase | undefined,
        color: list.color,
        durationWeeks: list.durationWeeks,
      })),
    ];

    // Store which template was used in settings (for non-BLANK templates)
    const settings = templateType !== 'BLANK'
      ? { listTemplate: templateType }
      : {};

    const board = await prisma.board.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        settings,
        members: {
          create: {
            userId: session.user.id,
            role: 'ADMIN',
          },
        },
        lists: {
          create: listsToCreate,
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
