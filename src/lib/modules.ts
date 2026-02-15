import { LINKED_TASK_PRESETS } from '@/lib/task-presets';
import type { TaskReleaseMode } from '@/types';

export interface ModuleTaskTemplate {
  id: string;
  title: string;
  titleOverride: string | null;
  color: string;
  description: string | null;
  storyPoints: number | null;
  featureImage: string | null;
  tags: string[];
  destinationMode: TaskReleaseMode;
  chainGroupId: string | null;
  chainOrder: number | null;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDestinationMode(value: unknown): TaskReleaseMode {
  return value === 'STAGED' ? 'STAGED' : 'IMMEDIATE';
}

export function createSingleModuleTaskTemplate(): ModuleTaskTemplate {
  return {
    id: createId('task'),
    title: 'TASK',
    titleOverride: null,
    color: '#3b82f6',
    description: null,
    storyPoints: null,
    featureImage: null,
    tags: [],
    destinationMode: 'IMMEDIATE',
    chainGroupId: null,
    chainOrder: null,
  };
}

export function createLinkedFourTaskTemplates(): ModuleTaskTemplate[] {
  const chainGroupId = createId('chain');

  return LINKED_TASK_PRESETS.map((preset, index) => ({
    id: createId('task'),
    title: preset.suffix,
    titleOverride: null,
    color: preset.color,
    description: null,
    storyPoints: preset.defaultStoryPoints,
    featureImage: null,
    tags: [preset.defaultTag],
    destinationMode: 'IMMEDIATE' as TaskReleaseMode,
    chainGroupId,
    chainOrder: index,
  }));
}

export function getDefaultModuleTaskTemplates(): ModuleTaskTemplate[] {
  return createLinkedFourTaskTemplates();
}

export function normalizeModuleTaskTemplates(value: unknown): ModuleTaskTemplate[] {
  const source = Array.isArray(value) ? value : [];
  const normalized: ModuleTaskTemplate[] = [];

  source.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const row = item as Record<string, unknown>;

    // Backwards compatibility with old fixed-key template structure.
    const legacyKey = typeof row.key === 'string' ? row.key : '';
    const legacyMap: Record<string, { title: string; color: string; order: number }> = {
      concept: { title: 'CONCEPT', color: '#8b5cf6', order: 0 },
      static_assets: { title: 'STATIC ART', color: '#22c55e', order: 1 },
      static_art: { title: 'STATIC ART', color: '#22c55e', order: 1 },
      concept_fx: { title: 'CONCEPT : FX/ANIMATION', color: '#8b5cf6', order: 2 },
      fx_animation: { title: 'FX/ANIMATION', color: '#ec4899', order: 3 },
    };
    const legacy = legacyKey ? legacyMap[legacyKey] : undefined;

    normalized.push({
      id: typeof row.id === 'string' && row.id.trim() ? row.id : createId(`task-${index}`),
      title: typeof row.title === 'string' && row.title.trim()
        ? row.title.trim()
        : legacy?.title || 'TASK',
      titleOverride: typeof row.titleOverride === 'string' && row.titleOverride.trim()
        ? row.titleOverride.trim()
        : null,
      color: typeof row.color === 'string' && row.color.trim()
        ? row.color.trim()
        : legacy?.color || '#3b82f6',
      description: typeof row.description === 'string' ? row.description.trim() || null : null,
      storyPoints: typeof row.storyPoints === 'number' ? row.storyPoints : null,
      featureImage: typeof row.featureImage === 'string' ? row.featureImage.trim() || null : null,
      tags: Array.isArray(row.tags)
        ? (row.tags as unknown[]).filter((t): t is string => typeof t === 'string' && t.trim().length > 0).map(t => t.trim())
        : [],
      destinationMode: normalizeDestinationMode(row.destinationMode),
      chainGroupId: typeof row.chainGroupId === 'string' && row.chainGroupId.trim()
        ? row.chainGroupId.trim()
        : legacy
          ? 'legacy-default-chain'
          : null,
      chainOrder: typeof row.chainOrder === 'number'
        ? row.chainOrder
        : legacy
          ? legacy.order
          : null,
    });
  });

  if (normalized.length === 0) {
    return [];
  }

  return normalized;
}
