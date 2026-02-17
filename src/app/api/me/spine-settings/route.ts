import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

function parseBoardPathMap(rawValue: string | null): Record<string, string> | null {
  if (!rawValue) return {};

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const map: Record<string, string> = {};
    for (const [boardId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed) continue;
      map[boardId] = trimmed;
    }

    return map;
  } catch {
    return null;
  }
}

function getBoardScopedPath(rawValue: string | null, boardId: string | null): string | null {
  if (!boardId) {
    return rawValue ?? null;
  }

  const map = parseBoardPathMap(rawValue);
  if (map === null) {
    // Legacy single-path value fallback.
    return rawValue ?? null;
  }

  return map[boardId] ?? null;
}

// GET /api/me/spine-settings
export async function GET(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    const settings = await prisma.userSpineSettings.findUnique({
      where: { userId: session.user.id },
      select: {
        finalAssetsPath: true,
        updatedAt: true,
      },
    });

    return apiSuccess({
      finalAssetsPath: getBoardScopedPath(settings?.finalAssetsPath ?? null, boardId),
      updatedAt: settings?.updatedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('Failed to fetch spine settings:', error);
    return ApiErrors.internal('Failed to fetch spine settings');
  }
}

// PATCH /api/me/spine-settings
export async function PATCH(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    const body = await request.json();
    const rawPath = body?.finalAssetsPath;

    let finalAssetsPath: string | null = null;
    if (typeof rawPath === 'string') {
      const trimmed = rawPath.trim();
      finalAssetsPath = trimmed.length > 0 ? trimmed : null;
    } else if (rawPath !== null && rawPath !== undefined) {
      return ApiErrors.validation('finalAssetsPath must be a string or null');
    }

    if (finalAssetsPath && finalAssetsPath.length > 1000) {
      return ApiErrors.validation('finalAssetsPath is too long');
    }

    const existing = await prisma.userSpineSettings.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        finalAssetsPath: true,
      },
    });

    let nextStoredValue: string | null;

    if (boardId) {
      const parsedMap = parseBoardPathMap(existing?.finalAssetsPath ?? null);
      const pathMap =
        parsedMap === null
          ? {}
          : parsedMap;

      if (finalAssetsPath) {
        pathMap[boardId] = finalAssetsPath;
      } else {
        delete pathMap[boardId];
      }

      const boardEntries = Object.entries(pathMap).filter(([, value]) => typeof value === 'string' && value.trim().length > 0);
      nextStoredValue = boardEntries.length > 0
        ? JSON.stringify(Object.fromEntries(boardEntries))
        : null;
    } else {
      nextStoredValue = finalAssetsPath;
    }

    const updated = await prisma.userSpineSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        finalAssetsPath: nextStoredValue,
      },
      update: {
        finalAssetsPath: nextStoredValue,
      },
      select: {
        finalAssetsPath: true,
        updatedAt: true,
      },
    });

    return apiSuccess({
      finalAssetsPath: getBoardScopedPath(updated.finalAssetsPath, boardId),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to update spine settings:', error);
    return ApiErrors.internal('Failed to update spine settings');
  }
}
