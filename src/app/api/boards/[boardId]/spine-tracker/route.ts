import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createEmptyState } from '@/components/spine-tracker/utils';

// GET /api/boards/[boardId]/spine-tracker — Fetch spine tracker data
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth();
    const { boardId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Verify user is a member of this board
    const membership = await prisma.boardMember.findFirst({
      where: { boardId, userId: session.user.id },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this board' } },
        { status: 403 }
      );
    }

    // Fetch or create spine tracker data
    let record = await prisma.spineTrackerData.findUnique({
      where: { boardId },
    });

    if (!record) {
      // Get the board name for the default project name
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        select: { name: true },
      });

      record = await prisma.spineTrackerData.create({
        data: {
          boardId,
          data: createEmptyState(board?.name || 'Untitled Project') as object,
          version: 1,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: record.id,
          data: record.data,
          version: record.version,
          updatedAt: record.updatedAt.toISOString(),
        },
      },
      {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  } catch (error) {
    console.error('[SPINE_TRACKER_GET]', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL', message: 'Failed to fetch spine tracker data' } },
      { status: 500 }
    );
  }
}

// PUT /api/boards/[boardId]/spine-tracker — Save spine tracker data (with optimistic concurrency)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth();
    const { boardId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Verify user is a member of this board
    const membership = await prisma.boardMember.findFirst({
      where: { boardId, userId: session.user.id },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this board' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { data, version } = body;

    if (!data || typeof version !== 'number') {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing data or version' } },
        { status: 400 }
      );
    }

    // Optimistic concurrency check: only update if version matches
    const existing = await prisma.spineTrackerData.findUnique({
      where: { boardId },
    });

    if (existing && existing.version !== version) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Data has been modified by another user. Please reload and try again.',
          },
          currentVersion: existing.version,
        },
        { status: 409 }
      );
    }

    const record = await prisma.spineTrackerData.upsert({
      where: { boardId },
      create: {
        boardId,
        data: data as object,
        version: 1,
      },
      update: {
        data: data as object,
        version: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        version: record.version,
        updatedAt: record.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[SPINE_TRACKER_PUT]', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL', message: 'Failed to save spine tracker data' } },
      { status: 500 }
    );
  }
}
