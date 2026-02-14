import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import {
  normalizeModuleTaskTemplates,
} from '@/lib/modules';

// GET /api/settings/modules
export async function GET() {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const modules = await prisma.boardModule.findMany({
      orderBy: { position: 'asc' },
    });

    const normalized = modules.map((module) => ({
      ...module,
      taskTemplates: normalizeModuleTaskTemplates(module.taskTemplates),
    }));

    return apiSuccess(normalized);
  } catch (error) {
    console.error('Failed to fetch modules:', error);
    return ApiErrors.internal('Failed to fetch modules');
  }
}

// POST /api/settings/modules
export async function POST(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() || null : null;
    const symbol = typeof body?.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';
    const epicName = typeof body?.epicName === 'string' ? body.epicName.trim() : '';
    const userStoryDescription = typeof body?.userStoryDescription === 'string'
      ? body.userStoryDescription.trim() || null
      : null;
    const userStoryFeatureImage = typeof body?.userStoryFeatureImage === 'string'
      ? body.userStoryFeatureImage.trim() || null
      : null;

    if (!name) return ApiErrors.validation('Module name is required');
    if (!symbol) return ApiErrors.validation('Module symbol is required');
    if (!epicName) return ApiErrors.validation('Epic name is required');

    const existing = await prisma.boardModule.findUnique({
      where: { symbol },
      select: { id: true },
    });

    if (existing) {
      return ApiErrors.validation('A module with this symbol already exists');
    }

    const maxPosition = await prisma.boardModule.aggregate({
      _max: { position: true },
    });

    const taskTemplates = normalizeModuleTaskTemplates(body?.taskTemplates);
    if (taskTemplates.length === 0) {
      return ApiErrors.validation('At least one task template is required');
    }

    const createData = {
        name,
        description,
        symbol,
        epicName,
        userStoryDescription,
        userStoryFeatureImage,
        taskTemplates: taskTemplates as unknown as Prisma.InputJsonValue,
        position: (maxPosition._max.position ?? -1) + 1,
      };

    const created = await prisma.boardModule.create({
      data: createData as unknown as Prisma.BoardModuleCreateInput,
    });

    return apiSuccess({
      ...created,
      taskTemplates: normalizeModuleTaskTemplates(created.taskTemplates),
    }, 201);
  } catch (error) {
    console.error('Failed to create module:', error);
    return ApiErrors.internal('Failed to create module');
  }
}
