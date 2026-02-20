import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import {
  createDefaultSkinAssetsConfig,
  normalizeSkinAssetsConfig,
  SKIN_SETTINGS_SCOPE,
} from '@/lib/skin-assets';

interface SkinSettingsResponse {
  config: ReturnType<typeof createDefaultSkinAssetsConfig>;
  updatedAt: string | null;
}

async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { permission: true },
  });
  return user?.permission === 'SUPER_ADMIN';
}

// GET /api/settings/skins
export async function GET() {
  try {
    const { response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const settings = await prisma.skinSettings.findUnique({
      where: { scope: SKIN_SETTINGS_SCOPE },
      select: {
        config: true,
        updatedAt: true,
      },
    });

    const config = normalizeSkinAssetsConfig(settings?.config ?? createDefaultSkinAssetsConfig());
    const payload: SkinSettingsResponse = {
      config,
      updatedAt: settings?.updatedAt?.toISOString() ?? null,
    };

    return NextResponse.json(
      { success: true, data: payload },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch skin settings:', error);
    return ApiErrors.internal('Failed to fetch skin settings');
  }
}

// PATCH /api/settings/skins
export async function PATCH(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    if (!(await isSuperAdmin(session.user.id))) {
      return ApiErrors.forbidden('Super Admin access required');
    }

    const body = (await request.json()) as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return ApiErrors.validation('Invalid request body');
    }

    const rawConfig = (body as Record<string, unknown>).config ?? body;
    const normalized = normalizeSkinAssetsConfig(rawConfig);

    const saved = await prisma.skinSettings.upsert({
      where: { scope: SKIN_SETTINGS_SCOPE },
      update: {
        config: normalized as unknown as Prisma.InputJsonValue,
      },
      create: {
        scope: SKIN_SETTINGS_SCOPE,
        config: normalized as unknown as Prisma.InputJsonValue,
      },
      select: {
        updatedAt: true,
      },
    });

    const payload: SkinSettingsResponse = {
      config: normalized,
      updatedAt: saved.updatedAt.toISOString(),
    };

    return apiSuccess(payload);
  } catch (error) {
    console.error('Failed to update skin settings:', error);
    return ApiErrors.internal('Failed to update skin settings');
  }
}
