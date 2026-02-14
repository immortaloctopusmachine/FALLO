import { LINKED_TASK_PRESETS } from '@/lib/task-presets';
import type { TaskReleaseMode } from '@/types';

export interface ModuleTaskTemplate {
  id: string;
  title: string;
  color: string;
  description: string | null;
  storyPoints: number | null;
  featureImage: string | null;
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
    color: '#3b82f6',
    description: null,
    storyPoints: null,
    featureImage: null,
    destinationMode: 'IMMEDIATE',
    chainGroupId: null,
    chainOrder: null,
  };
}

export function createLinkedThreeTaskTemplates(): ModuleTaskTemplate[] {
  const chainGroupId = createId('chain');

  return LINKED_TASK_PRESETS.map((preset, index) => ({
    id: createId('task'),
    title: preset.suffix,
    color: preset.color,
    description: null,
    storyPoints: null,
    featureImage: null,
    destinationMode: 'IMMEDIATE' as TaskReleaseMode,
    chainGroupId,
    chainOrder: index,
  }));
}

export function getDefaultModuleTaskTemplates(): ModuleTaskTemplate[] {
  return createLinkedThreeTaskTemplates();
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
      fx_animation: { title: 'FX/ANIMATION', color: '#ec4899', order: 2 },
    };
    const legacy = legacyKey ? legacyMap[legacyKey] : undefined;

    normalized.push({
      id: typeof row.id === 'string' && row.id.trim() ? row.id : createId(`task-${index}`),
      title: typeof row.title === 'string' && row.title.trim()
        ? row.title.trim()
        : legacy?.title || 'TASK',
      color: typeof row.color === 'string' && row.color.trim()
        ? row.color.trim()
        : legacy?.color || '#3b82f6',
      description: typeof row.description === 'string' ? row.description.trim() || null : null,
      storyPoints: typeof row.storyPoints === 'number' ? row.storyPoints : null,
      featureImage: typeof row.featureImage === 'string' ? row.featureImage.trim() || null : null,
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
