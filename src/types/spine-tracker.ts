// Spine Tracker Types

// ============== STATUS TYPES ==============

export type SkeletonStatus = 'planned' | 'in_progress' | 'exported' | 'implemented';
export type AnimationStatus = SkeletonStatus | 'not_as_intended';
export type SoundFxTrigger = 'spine_event' | 'code_trigger' | 'timeline';

// ============== DATA TYPES ==============

export interface SoundFx {
  file: string;
  trigger: SoundFxTrigger;
  volume: number;
  notes: string;
}

export interface Animation {
  name: string;
  status: AnimationStatus;
  track: number;
  notes: string;
  soundFx: SoundFx[];
}

export interface Skin {
  name: string;
  status: AnimationStatus;
  notes: string;
}

export interface SpineEvent {
  name: string;
  animation: string;
  notes: string;
}

export interface SkeletonPlacement {
  parent: string | null;
  bone: string | null;
  notes: string;
}

export interface Skeleton {
  id: string;
  name: string;
  status: SkeletonStatus;
  zOrder: number;
  group: string;
  description: string;
  placement: SkeletonPlacement;
  animations: Animation[];
  skins: Skin[];
  events: SpineEvent[];
  generalNotes: string;
  isLayoutTemplate?: boolean;
}

// ============== GROUP TYPES ==============

export interface SkeletonGroup {
  id: string;
  label: string;
  icon: string;
}

// ============== STATE TYPES ==============

export interface SpineTrackerState {
  skeletons: Skeleton[];
  customGroups: Record<string, string>;
  groupOrder: string[];
  projectName: string;
  baseline: { skeletons: Skeleton[] } | null;
}

// ============== API TYPES ==============

export interface SpineTrackerRecord {
  id: string;
  data: SpineTrackerState;
  version: number;
  updatedAt: string;
}

export interface SpineTrackerSaveRequest {
  data: SpineTrackerState;
  version: number;
}

export interface SpineTrackerSaveResponse {
  id: string;
  version: number;
  updatedAt: string;
}

// ============== CHANGE TRACKING ==============

export interface SpineChange {
  type: 'added' | 'removed' | 'modified';
  skeleton: string;
  detail: string;
}

export interface ChangelogResult {
  hasChanges: boolean;
  changes: SpineChange[];
}

// ============== SAVE STATUS ==============

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'conflict' | 'loading';
