import { prisma } from '@/lib/prisma';
import { validateImportData, normalizeImportData } from '@/components/spine-tracker/utils';
import {
  requireAuth,
  requireBoardMember,
  hasPermission,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import type { PermissionLevel } from '@/lib/api-utils';

// POST /api/boards/[boardId]/spine-tracker/import — Import JSON from standalone app
export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { boardId } = await params;

    const membershipResult = await requireBoardMember(boardId, session.user.id);
    if (membershipResult.response) return membershipResult.response;

    if (!hasPermission(membershipResult.membership.permission as PermissionLevel, 'MEMBER')) {
      return ApiErrors.forbidden('Viewers cannot import spine tracker data');
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
      return ApiErrors.validation('Invalid spine tracker data format');
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

    return apiSuccess({
      id: record.id,
      version: record.version,
      skeletonCount: normalized.skeletons.length,
      updatedAt: record.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[SPINE_TRACKER_IMPORT]', error);
    return ApiErrors.internal('Failed to import spine tracker data');
  }
}
