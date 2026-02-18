import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createEmptyState } from '@/components/spine-tracker/utils';
import {
  requireAuth,
  requireBoardMember,
  hasPermission,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import type { PermissionLevel } from '@/lib/api-utils';

// GET /api/boards/[boardId]/spine-tracker — Fetch spine tracker data
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

    const responseData = apiSuccess({
      id: record.id,
      data: record.data,
      version: record.version,
      updatedAt: record.updatedAt.toISOString(),
    });
    responseData.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return responseData;
  } catch (error) {
    console.error('[SPINE_TRACKER_GET]', error);
    return ApiErrors.internal('Failed to fetch spine tracker data');
  }
}

// PUT /api/boards/[boardId]/spine-tracker — Save spine tracker data (with optimistic concurrency)
export async function PUT(
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
      return ApiErrors.forbidden('Viewers cannot edit spine tracker data');
    }

    const body = await request.json();
    const { data, version } = body;

    if (!data || typeof version !== 'number') {
      return ApiErrors.validation('Missing data or version');
    }

    // Optimistic concurrency check: only update if version matches
    const existing = await prisma.spineTrackerData.findUnique({
      where: { boardId },
    });

    if (existing && existing.version !== version) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CONFLICT', message: 'Data has been modified by another user. Please reload and try again.' },
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

    return apiSuccess({
      id: record.id,
      version: record.version,
      updatedAt: record.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[SPINE_TRACKER_PUT]', error);
    return ApiErrors.internal('Failed to save spine tracker data');
  }
}
