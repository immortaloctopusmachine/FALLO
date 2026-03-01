import { prisma } from '@/lib/prisma';
import {
  ApiErrors,
  apiSuccess,
  requireAdmin,
  requireAuth,
} from '@/lib/api-utils';
import { DEFAULT_SENIORITY_CONFIGS, sortBySeniority } from '@/lib/rewards/seniority';

// GET /api/admin/seniority-config
export async function GET() {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const existingConfigs = await prisma.seniorityConfig.findMany();
    if (existingConfigs.length === 0) {
      await prisma.seniorityConfig.createMany({
        data: DEFAULT_SENIORITY_CONFIGS,
        skipDuplicates: true,
      });
    }

    const configs = await prisma.seniorityConfig.findMany();

    return apiSuccess(sortBySeniority(configs));
  } catch (error) {
    console.error('Failed to fetch seniority configs:', error);
    return ApiErrors.internal('Failed to fetch seniority configs');
  }
}
