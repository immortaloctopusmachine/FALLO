import { ensureTimelineBlockIntegrity } from '@/lib/timeline-block-integrity';
import { renumberTimelineBlockPositions } from '@/lib/timeline-block-position';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// POST /api/boards/[boardId]/timeline/blocks/repair
// Repairs timeline blocks by re-aligning them to Mon-Fri weeks and removing overlaps.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { boardId } = await params;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    let syncToList = true;
    try {
      const body = await request.json();
      syncToList = body?.syncToList !== false;
    } catch {
      // No JSON body provided; default behavior keeps list dates in sync.
    }

    const result = await ensureTimelineBlockIntegrity(boardId, { syncToList });
    await renumberTimelineBlockPositions(boardId);

    return apiSuccess({
      repaired: true,
      fixedBlocks: result.fixedBlocks,
      syncToList,
    });
  } catch (error) {
    console.error('Failed to repair timeline blocks:', error);
    return ApiErrors.internal('Failed to repair timeline blocks');
  }
}
