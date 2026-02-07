import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateImportData, normalizeImportData } from '@/components/spine-tracker/utils';

// POST /api/boards/[boardId]/spine-tracker/import — Import JSON from standalone app
export async function POST(
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
    const importData = body.data || body;

    // Handle both formats: { skeletons: [...] } (standalone export) and full SpineTrackerState
    let rawData;
    if (importData.skeletons && !importData.projectName) {
      // Standalone format: wrap in full state
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        select: { name: true },
      });
      rawData = {
        skeletons: importData.skeletons,
        customGroups: {},
        groupOrder: ['symbols', 'ui', 'characters', 'effects', 'screens', 'layout', 'other'],
        projectName: board?.name || 'Imported Project',
        baseline: null,
      };
    } else {
      rawData = importData;
    }

    if (!validateImportData(rawData)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid spine tracker data format' } },
        { status: 400 }
      );
    }

    const normalized = normalizeImportData(rawData);

    const record = await prisma.spineTrackerData.upsert({
      where: { boardId },
      create: {
        boardId,
        data: normalized as object,
        version: 1,
      },
      update: {
        data: normalized as object,
        version: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        version: record.version,
        skeletonCount: normalized.skeletons.length,
        updatedAt: record.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[SPINE_TRACKER_IMPORT]', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL', message: 'Failed to import spine tracker data' } },
      { status: 500 }
    );
  }
}
