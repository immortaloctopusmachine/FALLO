import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import {
  normalizeAnimationArray,
  normalizeEventArray,
  normalizeGroup,
  normalizeSkeletonName,
  normalizeSkinArray,
  normalizeZOrder,
  toModuleResponse,
  toSkeletonStatus,
  toStringOrNull,
} from './_normalizers';

// GET /api/settings/spine-modules
export async function GET() {
  try {
    const { response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const modules = await prisma.spineSkeletonModule.findMany({
      orderBy: { skeletonName: 'asc' },
    });

    return apiSuccess(modules.map(toModuleResponse));
  } catch (error) {
    console.error('Failed to fetch spine modules:', error);
    return ApiErrors.internal('Failed to fetch spine modules');
  }
}

// POST /api/settings/spine-modules
export async function POST(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const adminResult = await requireAdmin(session.user.id);
    if (adminResult.response) return adminResult.response;

    const body = await request.json();

    const skeletonName = normalizeSkeletonName(body?.skeletonName);
    if (!skeletonName) {
      return ApiErrors.validation('skeletonName is required');
    }

    const duplicate = await prisma.spineSkeletonModule.findUnique({
      where: { skeletonName },
      select: { id: true },
    });
    if (duplicate) {
      return ApiErrors.validation('A module with this skeletonName already exists');
    }

    const createdModule = await prisma.spineSkeletonModule.create({
      data: {
        skeletonName,
        group: normalizeGroup(body?.group),
        status: toSkeletonStatus(body?.status),
        zOrder: normalizeZOrder(body?.zOrder),
        description: toStringOrNull(body?.description),
        placementParent: toStringOrNull(body?.placementParent),
        placementBone: toStringOrNull(body?.placementBone),
        placementNotes: toStringOrNull(body?.placementNotes),
        generalNotes: toStringOrNull(body?.generalNotes),
        animations: normalizeAnimationArray(body?.animations) as unknown as Prisma.InputJsonValue,
        skins: normalizeSkinArray(body?.skins) as unknown as Prisma.InputJsonValue,
        events: normalizeEventArray(body?.events) as unknown as Prisma.InputJsonValue,
      },
    });

    return apiSuccess(toModuleResponse(createdModule), 201);
  } catch (error) {
    console.error('Failed to create spine module:', error);
    return ApiErrors.internal('Failed to create spine module');
  }
}
