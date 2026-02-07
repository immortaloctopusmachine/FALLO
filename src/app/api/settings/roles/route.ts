import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

// GET /api/settings/roles - Get all company roles
export async function GET() {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const roles = await prisma.companyRole.findMany({
      where: {
        studioId: null, // Global roles only for now
      },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { userCompanyRoles: true },
        },
      },
    });

    return apiSuccess(roles);
  } catch (error) {
    console.error('Failed to fetch company roles:', error);
    return ApiErrors.internal('Failed to fetch company roles');
  }
}

// POST /api/settings/roles - Create a new company role
export async function POST(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiErrors.validation('Role name is required');
    }

    // Get the highest position
    const maxPosition = await prisma.companyRole.aggregate({
      where: { studioId: null },
      _max: { position: true },
    });

    const role = await prisma.companyRole.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        position: (maxPosition._max.position ?? -1) + 1,
        studioId: null,
      },
    });

    return apiSuccess(role, 201);
  } catch (error) {
    console.error('Failed to create company role:', error);
    return ApiErrors.internal('Failed to create company role');
  }
}
