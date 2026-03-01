import { prisma } from '@/lib/prisma';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { ensureBadgeDefinitionsSeeded, listActiveBadgeDefinitions } from '@/lib/rewards/badges';

// GET /api/badges
export async function GET() {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    await ensureBadgeDefinitionsSeeded(prisma);
    const definitions = await listActiveBadgeDefinitions(prisma);

    return apiSuccess(definitions);
  } catch (error) {
    console.error('Failed to fetch badge definitions:', error);
    return ApiErrors.internal('Failed to fetch badge definitions');
  }
}
