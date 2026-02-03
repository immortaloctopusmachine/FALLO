import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ boardId: string; cardId: string }>;
}

// GET /api/boards/[boardId]/cards/[cardId]/assignees
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { cardId } = await context.params;

    const assignees = await prisma.cardUser.findMany({
      where: { cardId },
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
    });

    return NextResponse.json({ success: true, data: assignees });
  } catch (error) {
    console.error('Failed to fetch assignees:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_FAILED', message: 'Failed to fetch assignees' } },
      { status: 500 }
    );
  }
}

// POST /api/boards/[boardId]/cards/[cardId]/assignees
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { cardId } = await context.params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_USER', message: 'User ID is required' } },
        { status: 400 }
      );
    }

    // Check if already assigned
    const existing = await prisma.cardUser.findUnique({
      where: {
        userId_cardId: { userId, cardId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_ASSIGNED', message: 'User is already assigned' } },
        { status: 400 }
      );
    }

    const assignee = await prisma.cardUser.create({
      data: { userId, cardId },
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
    });

    return NextResponse.json({ success: true, data: assignee });
  } catch (error) {
    console.error('Failed to add assignee:', error);
    return NextResponse.json(
      { success: false, error: { code: 'CREATE_FAILED', message: 'Failed to add assignee' } },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[boardId]/cards/[cardId]/assignees
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { cardId } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_USER', message: 'User ID is required' } },
        { status: 400 }
      );
    }

    await prisma.cardUser.delete({
      where: {
        userId_cardId: { userId, cardId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove assignee:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DELETE_FAILED', message: 'Failed to remove assignee' } },
      { status: 500 }
    );
  }
}
