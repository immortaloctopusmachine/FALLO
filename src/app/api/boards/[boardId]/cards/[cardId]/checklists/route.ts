import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ boardId: string; cardId: string }>;
}

// GET /api/boards/[boardId]/cards/[cardId]/checklists
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { cardId } = await context.params;

    const checklists = await prisma.checklist.findMany({
      where: { cardId },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json({ success: true, data: checklists });
  } catch (error) {
    console.error('Failed to fetch checklists:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch checklists' } },
      { status: 500 }
    );
  }
}

// POST /api/boards/[boardId]/cards/[cardId]/checklists
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { cardId } = await context.params;
    const body = await request.json();
    const { name, type = 'todo' } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_NAME', message: 'Checklist name is required' } },
        { status: 400 }
      );
    }

    // Get highest position
    const lastChecklist = await prisma.checklist.findFirst({
      where: { cardId },
      orderBy: { position: 'desc' },
    });

    const checklist = await prisma.checklist.create({
      data: {
        name: name.trim(),
        type,
        position: (lastChecklist?.position ?? -1) + 1,
        cardId,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ success: true, data: checklist });
  } catch (error) {
    console.error('Failed to create checklist:', error);
    return NextResponse.json(
      { success: false, error: { code: 'CREATE_FAILED', message: 'Failed to create checklist' } },
      { status: 500 }
    );
  }
}
