import { prisma } from '@/lib/prisma';
import { exportAsMarkdown, exportChangelogAsMarkdown, generateChangelog } from '@/components/spine-tracker/utils';
import type { SpineTrackerState } from '@/types/spine-tracker';
import {
  requireAuth,
  requireBoardMember,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/boards/[boardId]/spine-tracker/export?format=json|markdown|changelog
export async function GET(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { boardId } = await params;

    const membershipResult = await requireBoardMember(boardId, session.user.id);
    if (membershipResult.response) return membershipResult.response;

    const record = await prisma.spineTrackerData.findUnique({
      where: { boardId },
    });

    if (!record) {
      return ApiErrors.notFound('Spine tracker data');
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
          return apiSuccess({ hasChanges: false, content: '' });
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
    return ApiErrors.internal('Failed to export spine tracker data');
  }
}
