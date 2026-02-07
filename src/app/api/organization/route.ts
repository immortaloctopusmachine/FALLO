import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/organization - Get organization overview data
export async function GET() {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const [studios, teams, users] = await Promise.all([
      prisma.studio.findMany({
        where: { archivedAt: null },
        orderBy: { name: 'asc' },
        include: {
          teams: {
            where: { archivedAt: null },
            select: { id: true },
          },
          _count: {
            select: { teams: { where: { archivedAt: null } } },
          },
        },
      }),
      prisma.team.findMany({
        where: { archivedAt: null },
        orderBy: { name: 'asc' },
        include: {
          studio: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              members: true,
              boards: { where: { archivedAt: null } },
            },
          },
        },
      }),
      prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          permission: true,
          _count: {
            select: { teamMembers: true },
          },
        },
      }),
    ]);

    return apiSuccess({ studios, teams, users });
  } catch (error) {
    console.error('Failed to fetch organization data:', error);
    return ApiErrors.internal('Failed to fetch organization data');
  }
}
