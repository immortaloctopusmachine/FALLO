import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { exportAsMarkdown, exportChangelogAsMarkdown, generateChangelog } from '@/components/spine-tracker/utils';
import type { SpineTrackerState } from '@/types/spine-tracker';

// GET /api/boards/[boardId]/spine-tracker/export?format=json|markdown|changelog
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

    const membership = await prisma.boardMember.findFirst({
      where: { boardId, userId: session.user.id },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this board' } },
        { status: 403 }
      );
    }

    const record = await prisma.spineTrackerData.findUnique({
      where: { boardId },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No spine tracker data found' } },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const state = record.data as unknown as SpineTrackerState;

    switch (format) {
      case 'markdown': {
        const md = exportAsMarkdown(state);
        return new Response(md, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="SPINE_TRACKER.md"`,
          },
        });
      }

      case 'changelog': {
        const changelog = generateChangelog(state, state.baseline);
        if (!changelog.hasChanges) {
          return NextResponse.json({
            success: true,
            data: { hasChanges: false, content: '' },
          });
        }
        const md = exportChangelogAsMarkdown(changelog);
        return new Response(md, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="spine-changes.md"`,
          },
        });
      }

      case 'json':
      default: {
        const json = JSON.stringify(state, null, 2);
        return new Response(json, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="spine-tracker.json"`,
          },
        });
      }
    }
  } catch (error) {
    console.error('[SPINE_TRACKER_EXPORT]', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL', message: 'Failed to export spine tracker data' } },
      { status: 500 }
    );
  }
}
