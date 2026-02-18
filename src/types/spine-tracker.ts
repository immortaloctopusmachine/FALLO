// Spine Tracker Types

// ============== STATUS TYPES ==============

export type SkeletonStatus =
  | 'planned'
  | 'ready_to_be_implemented'
  | 'implemented'
  | 'not_as_intended';
export type AnimationStatus = SkeletonStatus;
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
  targetBone?: string;
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
  isGeneric?: boolean;
  description: string;
  placement: SkeletonPlacement;
  targetBone?: string;
  animations: Animation[];
  skins: Skin[];
  events: SpineEvent[];
  previewImageDataUrl?: string | null;
  connectedTasks?: string[];
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

// ============== DEFAULT MODULES ==============

export interface SpineSkeletonModule {
  id: string;
  skeletonName: string;
  group: string;
  status: SkeletonStatus;
  zOrder: number;
  description: string | null;
  placementParent: string | null;
  placementBone: string | null;
  placementNotes: string | null;
  generalNotes: string | null;
  animations: Animation[];
  skins: Skin[];
  events: SpineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface SpineDiscoveredAsset {
  name: string;
  animations: Animation[];
  skins: Skin[];
  events: SpineEvent[];
  previewImageDataUrl: string | null;
}
