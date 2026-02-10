import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';

function normalizeUnitOffset(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

// PATCH /api/settings/core-project-templates/[templateId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { templateId } = await params;
    const body = await request.json();
    const {
      name,
      description,
      position,
      blocks,
      events,
    }: {
      name?: string;
      description?: string | null;
      position?: number;
      blocks?: { id?: string; blockTypeId: string }[];
      events?: { id?: string; eventTypeId: string; title?: string | null; unitOffset?: number }[];
    } = body;

    const existing = await prisma.coreProjectTemplate.findUnique({
      where: { id: templateId },
      include: {
        blocks: true,
        events: true,
      },
    });
    if (!existing || existing.archivedAt) {
      return ApiErrors.notFound('Core project template');
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      if (!name.trim()) {
        return ApiErrors.validation('Template name is required');
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (position !== undefined) updateData.position = position;

    if (blocks) {
      const blockTypeIds = blocks
        .map((block) => block.blockTypeId)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
      if (blockTypeIds.length !== blocks.length) {
        return ApiErrors.validation('Each block must have a valid block type');
      }
      if (blockTypeIds.length > 0) {
        const count = await prisma.blockType.count({ where: { id: { in: blockTypeIds } } });
        if (count !== new Set(blockTypeIds).size) {
          return ApiErrors.validation('One or more block types are invalid');
        }
      }
    }

    if (events) {
      const eventTypeIds = events
        .map((event) => event.eventTypeId)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
      if (eventTypeIds.length !== events.length) {
        return ApiErrors.validation('Each event must have a valid event type');
      }
      if (eventTypeIds.length > 0) {
        const count = await prisma.eventType.count({ where: { id: { in: eventTypeIds } } });
        if (count !== new Set(eventTypeIds).size) {
          return ApiErrors.validation('One or more event types are invalid');
        }
      }
    }

    await prisma.coreProjectTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    if (blocks) {
      await prisma.coreProjectTemplateBlock.deleteMany({
        where: { templateId },
      });

      if (blocks.length > 0) {
        await prisma.coreProjectTemplateBlock.createMany({
          data: blocks.map((block, index) => ({
            templateId,
            blockTypeId: block.blockTypeId,
            position: index,
          })),
        });
      }
    }

    if (events) {
      await prisma.coreProjectTemplateEvent.deleteMany({
        where: { templateId },
      });

      if (events.length > 0) {
        await prisma.coreProjectTemplateEvent.createMany({
          data: events.map((event, index) => ({
            templateId,
            eventTypeId: event.eventTypeId,
            position: index,
            title: event.title?.trim() || null,
            unitOffset: normalizeUnitOffset(event.unitOffset, index * 5),
          })),
        });
      }
    }

    // Normalize top-level template ordering if positions changed.
    if (position !== undefined) {
      const allTemplates = await prisma.coreProjectTemplate.findMany({
        where: { archivedAt: null },
        orderBy: [{ position: 'asc' }, { updatedAt: 'asc' }],
        select: { id: true, position: true },
      });

      const updates: ReturnType<typeof prisma.coreProjectTemplate.update>[] = [];
      for (let i = 0; i < allTemplates.length; i++) {
        if (allTemplates[i].position !== i) {
          updates.push(
            prisma.coreProjectTemplate.update({
              where: { id: allTemplates[i].id },
              data: { position: i },
            })
          );
        }
      }
      if (updates.length > 0) {
        await prisma.$transaction(updates);
      }
    }

    const updated = await prisma.coreProjectTemplate.findUnique({
      where: { id: templateId },
      include: {
        blocks: {
          include: { blockType: true },
          orderBy: { position: 'asc' },
        },
        events: {
          include: { eventType: true },
          orderBy: [{ unitOffset: 'asc' }, { position: 'asc' }],
        },
      },
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error('Failed to update core project template:', error);
    return ApiErrors.internal('Failed to update core project template');
  }
}

// DELETE /api/settings/core-project-templates/[templateId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const { templateId } = await params;

    const existing = await prisma.coreProjectTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, isDefault: true, archivedAt: true },
    });
    if (!existing || existing.archivedAt) {
      return ApiErrors.notFound('Core project template');
    }

    if (existing.isDefault) {
      return ApiErrors.validation('Default core templates cannot be deleted');
    }

    await prisma.coreProjectTemplate.update({
      where: { id: templateId },
      data: { archivedAt: new Date() },
    });

    return apiSuccess(null);
  } catch (error) {
    console.error('Failed to delete core project template:', error);
    return ApiErrors.internal('Failed to delete core project template');
  }
}
