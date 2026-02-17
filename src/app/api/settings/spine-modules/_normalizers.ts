import type {
  Animation,
  AnimationStatus,
  Skin,
  SkeletonStatus,
  SoundFx,
  SoundFxTrigger,
  SpineEvent,
} from '@/types/spine-tracker';

const SKELETON_STATUSES = new Set<SkeletonStatus>([
  'planned',
  'implemented',
  'ready_to_be_implemented',
  'not_as_intended',
]);

const ANIMATION_STATUSES = new Set<AnimationStatus>([
  'planned',
  'implemented',
  'ready_to_be_implemented',
  'not_as_intended',
]);

const SOUND_FX_TRIGGERS = new Set<SoundFxTrigger>([
  'spine_event',
  'code_trigger',
  'timeline',
]);

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toSkeletonStatus(value: unknown): SkeletonStatus {
  if (value === 'in_progress' || value === 'exported') {
    return 'ready_to_be_implemented';
  }
  if (typeof value === 'string' && SKELETON_STATUSES.has(value as SkeletonStatus)) {
    return value as SkeletonStatus;
  }
  return 'planned';
}

function toAnimationStatus(value: unknown): AnimationStatus {
  if (value === 'in_progress' || value === 'exported') {
    return 'ready_to_be_implemented';
  }
  if (typeof value === 'string' && ANIMATION_STATUSES.has(value as AnimationStatus)) {
    return value as AnimationStatus;
  }
  return 'planned';
}

function toSoundFxTrigger(value: unknown): SoundFxTrigger {
  if (typeof value === 'string' && SOUND_FX_TRIGGERS.has(value as SoundFxTrigger)) {
    return value as SoundFxTrigger;
  }
  return 'spine_event';
}

function toSafeTrack(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(9, parsed));
}

function toSafeVolume(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(0, Math.min(1, parsed));
}

function normalizeSoundFxArray(value: unknown): SoundFx[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const obj = asObject(entry);
      if (!obj) return null;
      const file = toStringOrNull(obj.file);
      if (!file) return null;
      return {
        file,
        trigger: toSoundFxTrigger(obj.trigger),
        volume: toSafeVolume(obj.volume),
        notes: toStringOrNull(obj.notes) ?? '',
      } satisfies SoundFx;
    })
    .filter((entry): entry is SoundFx => entry !== null);
}

export function normalizeAnimationArray(value: unknown): Animation[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const obj = asObject(entry);
      if (!obj) return null;
      const name = toStringOrNull(obj.name);
      if (!name) return null;
      return {
        name,
        status: toAnimationStatus(obj.status),
        track: toSafeTrack(obj.track),
        notes: toStringOrNull(obj.notes) ?? '',
        soundFx: normalizeSoundFxArray(obj.soundFx),
      } satisfies Animation;
    })
    .filter((entry): entry is Animation => entry !== null);
}

export function normalizeSkinArray(value: unknown): Skin[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const obj = asObject(entry);
      if (!obj) return null;
      const name = toStringOrNull(obj.name);
      if (!name) return null;
      return {
        name,
        status: toAnimationStatus(obj.status),
        notes: toStringOrNull(obj.notes) ?? '',
      } satisfies Skin;
    })
    .filter((entry): entry is Skin => entry !== null);
}

export function normalizeEventArray(value: unknown): SpineEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const obj = asObject(entry);
      if (!obj) return null;
      const name = toStringOrNull(obj.name);
      if (!name) return null;
      return {
        name,
        animation: toStringOrNull(obj.animation) ?? '',
        notes: toStringOrNull(obj.notes) ?? '',
      } satisfies SpineEvent;
    })
    .filter((entry): entry is SpineEvent => entry !== null);
}

export function normalizeGroup(value: unknown): string {
  return toStringOrNull(value)?.toLowerCase() ?? 'other';
}

export function normalizeZOrder(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return 100;
  return Math.max(0, Math.min(999, parsed));
}

export function normalizeSkeletonName(value: unknown): string {
  return toStringOrNull(value)?.toUpperCase() ?? '';
}

export function toModuleResponse(module: {
  id: string;
  skeletonName: string;
  group: string;
  status: string;
  zOrder: number;
  description: string | null;
  placementParent: string | null;
  placementBone: string | null;
  placementNotes: string | null;
  generalNotes: string | null;
  animations: unknown;
  skins: unknown;
  events: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: module.id,
    skeletonName: module.skeletonName,
    group: module.group,
    status: toSkeletonStatus(module.status),
    zOrder: module.zOrder,
    description: module.description,
    placementParent: module.placementParent,
    placementBone: module.placementBone,
    placementNotes: module.placementNotes,
    generalNotes: module.generalNotes,
    animations: normalizeAnimationArray(module.animations),
    skins: normalizeSkinArray(module.skins),
    events: normalizeEventArray(module.events),
    createdAt: module.createdAt.toISOString(),
    updatedAt: module.updatedAt.toISOString(),
  };
}
