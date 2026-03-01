import { prisma } from '@/lib/prisma';
import {
  ApiErrors,
  apiSuccess,
  requireAdmin,
  requireAuth,
} from '@/lib/api-utils';
import {
  DEFAULT_SENIORITY_CONFIGS,
  isSeniority,
  parseSeniorityConfigPatch,
} from '@/lib/rewards/seniority';

// PATCH /api/admin/seniority-config/[seniority]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ seniority: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { seniority } = await params;
    if (!isSeniority(seniority)) {
      return ApiErrors.validation('Invalid seniority');
    }

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return ApiErrors.validation('Request body must be an object');
    }

    let updateData;
    try {
      updateData = parseSeniorityConfigPatch(body as Record<string, unknown>);
    } catch (error) {
      return ApiErrors.validation(
        error instanceof Error ? error.message : 'Invalid seniority config payload'
      );
    }

    const existingConfig = await prisma.seniorityConfig.findUnique({
      where: { seniority },
      select: { id: true },
    });

    const fallbackConfig = DEFAULT_SENIORITY_CONFIGS.find((config) => config.seniority === seniority);

    const config = existingConfig
      ? await prisma.seniorityConfig.update({
          where: { seniority },
          data: updateData,
        })
      : await prisma.seniorityConfig.create({
          data: {
            ...(fallbackConfig ?? { seniority }),
            ...updateData,
            seniority,
          },
        });

    return apiSuccess(config);
  } catch (error) {
    console.error('Failed to update seniority config:', error);
    return ApiErrors.internal('Failed to update seniority config');
  }
}
