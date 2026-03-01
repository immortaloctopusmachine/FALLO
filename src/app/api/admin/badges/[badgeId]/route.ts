import { prisma } from '@/lib/prisma';
import { ApiErrors, apiSuccess, requireAdmin, requireAuth } from '@/lib/api-utils';

type BadgeUpdateBody = {
  iconUrl?: string | null;
};

function normalizeIconUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new Error('iconUrl must be a string or null');
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Badge icon URL must use http or https');
    }
  } catch {
    throw new Error('Badge icon URL must be a valid absolute URL');
  }

  return trimmed;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ badgeId: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const adminCheck = await requireAdmin(session.user.id);
    if (adminCheck.response) return adminCheck.response;

    const { badgeId } = await params;
    if (!badgeId) {
      return ApiErrors.validation('Badge id is required');
    }

    const body = await request.json().catch(() => null) as BadgeUpdateBody | null;
    if (!body) {
      return ApiErrors.validation('Invalid request body');
    }

    let iconUrl: string | null | undefined;
    try {
      iconUrl = normalizeIconUrl(body.iconUrl);
    } catch (error) {
      return ApiErrors.validation(error instanceof Error ? error.message : 'Invalid icon URL');
    }

    if (iconUrl === undefined) {
      return ApiErrors.validation('No editable badge fields were provided');
    }

    const existing = await prisma.badgeDefinition.findUnique({
      where: { id: badgeId },
      select: { id: true },
    });

    if (!existing) {
      return ApiErrors.notFound('Badge definition');
    }

    const updated = await prisma.badgeDefinition.update({
      where: { id: badgeId },
      data: {
        iconUrl,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        tier: true,
        iconUrl: true,
        conditions: true,
      },
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error('Failed to update badge definition:', error);
    return ApiErrors.internal('Failed to update badge definition');
  }
}
