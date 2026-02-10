import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireAdmin,
  apiSuccess,
  ApiErrors,
} from '@/lib/api-utils';
import { STANDARD_SLOT_TEMPLATE, BRANDED_GAME_TEMPLATE } from '@/lib/list-templates';
import { PHASE_SEARCH_TERMS } from '@/lib/constants';
import type { ListPhase } from '@/types';

type TemplateSeed = {
  name: string;
  description: string;
  isDefault: boolean;
  blockPhases: ListPhase[];
};

type CreateTemplateBody = {
  name?: string;
  description?: string;
  blocks?: { blockTypeId: string }[];
  events?: { eventTypeId: string; title?: string | null; unitOffset?: number }[];
};

const DEFAULT_CORE_TEMPLATES: TemplateSeed[] = [
  {
    name: STANDARD_SLOT_TEMPLATE.name,
    description: STANDARD_SLOT_TEMPLATE.description,
    isDefault: true,
    blockPhases: STANDARD_SLOT_TEMPLATE.planningLists
      .map((list) => list.phase)
      .filter((phase): phase is ListPhase => Boolean(phase)),
  },
  {
    name: BRANDED_GAME_TEMPLATE.name,
    description: BRANDED_GAME_TEMPLATE.description,
    isDefault: true,
    blockPhases: BRANDED_GAME_TEMPLATE.planningLists
      .map((list) => list.phase)
      .filter((phase): phase is ListPhase => Boolean(phase)),
  },
];

async function findBlockTypeForPhase(phase: ListPhase) {
  const terms = PHASE_SEARCH_TERMS[phase] || [];
  for (const term of terms) {
    const found = await prisma.blockType.findFirst({
      where: {
        studioId: null,
        name: { contains: term, mode: 'insensitive' },
      },
      orderBy: { position: 'asc' },
    });
    if (found) return found;
  }

  return prisma.blockType.findFirst({
    where: { studioId: null },
    orderBy: { position: 'asc' },
  });
}

async function ensureDefaultTemplates() {
  const count = await prisma.coreProjectTemplate.count({
    where: { archivedAt: null },
  });

  if (count > 0) return;

  for (let i = 0; i < DEFAULT_CORE_TEMPLATES.length; i++) {
    const seed = DEFAULT_CORE_TEMPLATES[i];
    const blockTypeIds: string[] = [];
    for (const phase of seed.blockPhases) {
      const blockType = await findBlockTypeForPhase(phase);
      if (blockType) blockTypeIds.push(blockType.id);
    }

    await prisma.coreProjectTemplate.create({
      data: {
        name: seed.name,
        description: seed.description,
        isDefault: seed.isDefault,
        position: i,
        blocks: {
          create: blockTypeIds.map((blockTypeId, index) => ({
            position: index,
            blockTypeId,
          })),
        },
        events: {
          create: [],
        },
      },
    });
  }
}

function normalizeUnitOffset(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

// GET /api/settings/core-project-templates
export async function GET() {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    await ensureDefaultTemplates();

    const [templates, blockTypes, eventTypes] = await Promise.all([
      prisma.coreProjectTemplate.findMany({
        where: { archivedAt: null },
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
        orderBy: { position: 'asc' },
      }),
      prisma.blockType.findMany({
        where: { studioId: null },
        orderBy: { position: 'asc' },
      }),
      prisma.eventType.findMany({
        where: { studioId: null },
        orderBy: { position: 'asc' },
      }),
    ]);

    return apiSuccess({ templates, blockTypes, eventTypes });
  } catch (error) {
    console.error('Failed to fetch core project templates:', error);
    return ApiErrors.internal('Failed to fetch core project templates');
  }
}

// POST /api/settings/core-project-templates
export async function POST(request: Request) {
  try {
    const { session, response: authResponse } = await requireAuth();
    if (authResponse) return authResponse;

    const { response: adminResponse } = await requireAdmin(session.user.id);
    if (adminResponse) return adminResponse;

    const body = await request.json();
    const {
      name,
      description,
      blocks = [],
      events = [],
    }: CreateTemplateBody = body;

    if (!name || name.trim().length === 0) {
      return ApiErrors.validation('Template name is required');
    }

    const blockTypeIds = blocks
      .map((block) => block.blockTypeId)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    if (blockTypeIds.length !== blocks.length) {
      return ApiErrors.validation('Each block must have a valid block type');
    }

    const eventTypeIds = events
      .map((event) => event.eventTypeId)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    if (eventTypeIds.length !== events.length) {
      return ApiErrors.validation('Each event must have a valid event type');
    }

    const [existingBlockTypeCount, existingEventTypeCount] = await Promise.all([
      blockTypeIds.length
        ? prisma.blockType.count({ where: { id: { in: blockTypeIds } } })
        : Promise.resolve(0),
      eventTypeIds.length
        ? prisma.eventType.count({ where: { id: { in: eventTypeIds } } })
        : Promise.resolve(0),
    ]);

    if (blockTypeIds.length > 0 && existingBlockTypeCount !== new Set(blockTypeIds).size) {
      return ApiErrors.validation('One or more block types are invalid');
    }
    if (eventTypeIds.length > 0 && existingEventTypeCount !== new Set(eventTypeIds).size) {
      return ApiErrors.validation('One or more event types are invalid');
    }

    const maxPosition = await prisma.coreProjectTemplate.aggregate({
      where: { archivedAt: null },
      _max: { position: true },
    });

    const template = await prisma.coreProjectTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isDefault: false,
        position: (maxPosition._max.position ?? -1) + 1,
        blocks: {
          create: blocks.map((block, index) => ({
            position: index,
            blockTypeId: block.blockTypeId,
          })),
        },
        events: {
          create: events.map((event, index) => ({
            position: index,
            eventTypeId: event.eventTypeId,
            title: event.title?.trim() || null,
            unitOffset: normalizeUnitOffset(event.unitOffset, index * 5),
          })),
        },
      },
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

    return apiSuccess(template, 201);
  } catch (error) {
    console.error('Failed to create core project template:', error);
    return ApiErrors.internal('Failed to create core project template');
  }
}
