'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  Skeleton,
  Animation,
  SoundFx,
  Skin,
  SpineEvent,
  SkeletonStatus,
  SpineDiscoveredAsset,
  SpineSkeletonModule,
  SpineTrackerState,
  SaveStatus,
} from '@/types/spine-tracker';
import {
  createEmptyState,
  createSkeleton,
  createAnimation,
  getGroupForSkeleton,
  generateChangelog,
  exportAsMarkdown,
  exportChangelogAsMarkdown,
} from '@/components/spine-tracker/utils';

const AUTO_SAVE_DELAY = 1500; // ms

interface SpineTaskOption {
  id: string;
  title: string;
  listName: string;
}

interface SpineTrackerSessionCacheEntry {
  state: SpineTrackerState;
  version: number;
  saveStatus: Exclude<SaveStatus, 'loading'>;
  selectedSkeletonId: string | null;
  editMode: boolean;
  searchQuery: string;
  collapsedGroups: string[];
  spineModules: SpineSkeletonModule[];
  availableTaskOptions: SpineTaskOption[];
  finalAssetsPath: string | null;
  showGenericSkeletons: boolean;
}

const SPINE_TRACKER_SESSION_SCHEMA_VERSION = 1;
const SPINE_TRACKER_SESSION_STORAGE_KEY_PREFIX = 'spine-tracker-session:';

// Keep per-board Spine UI/data session in memory so switching board tabs can
// restore instantly even if the component remounts.
const spineTrackerSessionCache = new Map<string, SpineTrackerSessionCacheEntry>();

function getSessionStorageKey(boardId: string): string {
  return `${SPINE_TRACKER_SESSION_STORAGE_KEY_PREFIX}${boardId}`;
}

function stripPreviewImagesFromState(state: SpineTrackerState): SpineTrackerState {
  return {
    ...state,
    skeletons: state.skeletons.map((skeleton) => ({
      ...skeleton,
      // Keep session payload small enough for sessionStorage.
      previewImageDataUrl: null,
    })),
  };
}

function readSessionFromStorage(boardId: string): SpineTrackerSessionCacheEntry | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(getSessionStorageKey(boardId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      schemaVersion?: number;
      session?: Partial<SpineTrackerSessionCacheEntry>;
    };

    if (parsed.schemaVersion !== SPINE_TRACKER_SESSION_SCHEMA_VERSION || !parsed.session) {
      return null;
    }

    const session = parsed.session;
    if (!session.state) {
      return null;
    }

    const rawSaveStatus = session.saveStatus as SaveStatus | undefined;
    const normalizedSaveStatus: Exclude<SaveStatus, 'loading'> =
      rawSaveStatus && rawSaveStatus !== 'loading'
        ? (rawSaveStatus as Exclude<SaveStatus, 'loading'>)
        : 'saved';

    return {
      state: normalizeLoadedState(session.state),
      version: typeof session.version === 'number' ? session.version : 1,
      saveStatus: normalizedSaveStatus,
      selectedSkeletonId:
        typeof session.selectedSkeletonId === 'string' ? session.selectedSkeletonId : null,
      editMode: Boolean(session.editMode),
      searchQuery: typeof session.searchQuery === 'string' ? session.searchQuery : '',
      collapsedGroups: Array.isArray(session.collapsedGroups) ? session.collapsedGroups : [],
      spineModules: Array.isArray(session.spineModules) ? session.spineModules : [],
      availableTaskOptions: Array.isArray(session.availableTaskOptions)
        ? session.availableTaskOptions
        : [],
      finalAssetsPath: session.finalAssetsPath ?? null,
      showGenericSkeletons: Boolean(session.showGenericSkeletons),
    };
  } catch {
    return null;
  }
}

function getCachedSession(boardId: string): SpineTrackerSessionCacheEntry | null {
  const inMemory = spineTrackerSessionCache.get(boardId);
  if (inMemory) {
    return inMemory;
  }

  const fromStorage = readSessionFromStorage(boardId);
  if (fromStorage) {
    spineTrackerSessionCache.set(boardId, fromStorage);
  }

  return fromStorage;
}

function writeSessionToStorage(boardId: string, session: SpineTrackerSessionCacheEntry) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      getSessionStorageKey(boardId),
      JSON.stringify({
        schemaVersion: SPINE_TRACKER_SESSION_SCHEMA_VERSION,
        session: {
          ...session,
          state: stripPreviewImagesFromState(session.state),
        },
      })
    );
  } catch {
    // Ignore quota or serialization failures.
  }
}

function mapLegacyStatus(value: string | undefined): SkeletonStatus {
  if (value === 'in_progress' || value === 'exported') {
    return 'ready_to_be_implemented';
  }
  if (value === 'planned' || value === 'ready_to_be_implemented' || value === 'implemented' || value === 'not_as_intended') {
    return value;
  }
  return 'planned';
}

function normalizeLoadedState(state: SpineTrackerState): SpineTrackerState {
  const normalizedGroupOrder = Array.from(
    new Set(
      [...(state.groupOrder || []), 'symbols', 'ui', 'characters', 'screens', 'layout', 'other']
    )
  ).filter((groupId) => groupId !== 'effects');

  const normalizedSkeletons = (state.skeletons || []).map((skeleton) => {
    const group = skeleton.group === 'effects' ? 'other' : (skeleton.group || 'other');
    return {
      ...skeleton,
      group,
      status: mapLegacyStatus(skeleton.status),
      isGeneric: skeleton.isGeneric || false,
      targetBone: skeleton.targetBone || '',
      connectedTasks: Array.isArray(skeleton.connectedTasks)
        ? skeleton.connectedTasks
            .map((taskName) => (typeof taskName === 'string' ? taskName.trim() : ''))
            .filter(Boolean)
        : [],
      placement: {
        parent: skeleton.placement?.parent || null,
        bone: skeleton.placement?.bone || null,
        notes: skeleton.placement?.notes || '',
      },
      animations: (skeleton.animations || []).map((animation) => ({
        ...animation,
        status: mapLegacyStatus(animation.status as string),
      })),
      skins: (skeleton.skins || []).map((skin) => ({
        ...skin,
        status: mapLegacyStatus(skin.status as string),
      })),
      events: (skeleton.events || []).map((eventItem) => ({
        ...eventItem,
        notes: eventItem.notes || '',
      })),
    };
  });

  return {
    ...state,
    skeletons: normalizedSkeletons,
    customGroups: state.customGroups || {},
    groupOrder: normalizedGroupOrder,
  };
}

interface UseSpineTrackerOptions {
  boardId: string;
}

export function useSpineTracker({ boardId }: UseSpineTrackerOptions) {
  const cachedSession = getCachedSession(boardId);

  const [state, setState] = useState<SpineTrackerState>(
    () => cachedSession?.state ?? createEmptyState()
  );
  const [version, setVersion] = useState(cachedSession?.version ?? 1);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    cachedSession?.saveStatus ?? 'loading'
  );
  const [selectedSkeletonId, setSelectedSkeletonId] = useState<string | null>(
    cachedSession?.selectedSkeletonId ?? null
  );
  const [editMode, setEditMode] = useState(cachedSession?.editMode ?? false);
  const [searchQuery, setSearchQuery] = useState(cachedSession?.searchQuery ?? '');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(cachedSession?.collapsedGroups ?? [])
  );
  const [spineModules, setSpineModules] = useState<SpineSkeletonModule[]>(
    () => cachedSession?.spineModules ?? []
  );
  const [availableTaskOptions, setAvailableTaskOptions] = useState<SpineTaskOption[]>(
    () => cachedSession?.availableTaskOptions ?? []
  );
  const [finalAssetsPath, setFinalAssetsPath] = useState<string | null>(
    cachedSession?.finalAssetsPath ?? null
  );
  const [isUpdatingFinalAssetsPath, setIsUpdatingFinalAssetsPath] = useState(false);
  const [showGenericSkeletons, setShowGenericSkeletons] = useState(
    cachedSession?.showGenericSkeletons ?? false
  );

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  const versionRef = useRef(version);

  // Keep refs in sync
  stateRef.current = state;
  versionRef.current = version;

  // Persist the current session snapshot for this board so it restores after remount.
  useEffect(() => {
    const sessionSnapshot: SpineTrackerSessionCacheEntry = {
      state,
      version,
      saveStatus: saveStatus === 'loading' ? 'saved' : saveStatus,
      selectedSkeletonId,
      editMode,
      searchQuery,
      collapsedGroups: Array.from(collapsedGroups),
      spineModules,
      availableTaskOptions,
      finalAssetsPath,
      showGenericSkeletons,
    };

    spineTrackerSessionCache.set(boardId, sessionSnapshot);
    writeSessionToStorage(boardId, sessionSnapshot);
  }, [
    boardId,
    state,
    version,
    saveStatus,
    selectedSkeletonId,
    editMode,
    searchQuery,
    collapsedGroups,
    spineModules,
    availableTaskOptions,
    finalAssetsPath,
    showGenericSkeletons,
  ]);

  // ============== API COMMUNICATION ==============

  const fetchSpineMeta = useCallback(async () => {
    try {
      const [settingsRes, modulesRes, tasksRes] = await Promise.all([
        fetch(`/api/me/spine-settings?boardId=${encodeURIComponent(boardId)}`),
        fetch('/api/settings/spine-modules'),
        fetch(`/api/boards/${boardId}/spine-tracker/tasks`),
      ]);

      const [settingsJson, modulesJson, tasksJson] = await Promise.all([
        settingsRes.json(),
        modulesRes.json(),
        tasksRes.json(),
      ]);

      if (settingsJson.success) {
        setFinalAssetsPath(settingsJson.data?.finalAssetsPath ?? null);
      }

      if (modulesJson.success) {
        setSpineModules(modulesJson.data as SpineSkeletonModule[]);
      }

      if (tasksJson.success) {
        setAvailableTaskOptions(tasksJson.data as SpineTaskOption[]);
      }
    } catch (error) {
      console.error('Failed to fetch Spine metadata:', error);
    }
  }, [boardId]);

  const fetchData = useCallback(async (options?: { background?: boolean }) => {
    if (!options?.background) {
      setSaveStatus('loading');
    }
    try {
      const res = await fetch(`/api/boards/${boardId}/spine-tracker`);
      const json = await res.json();
      if (json.success) {
        const data = normalizeLoadedState(json.data.data as SpineTrackerState);
        setState(data);
        setVersion(json.data.version);
        setSaveStatus('saved');
        // Collapse all groups only on first-ever load when no UI collapse state exists.
        if (data.groupOrder) {
          setCollapsedGroups((prev) => (prev.size === 0 ? new Set(data.groupOrder) : prev));
        }
      } else {
        console.error('Failed to fetch spine tracker:', json.error);
        setSaveStatus('unsaved');
      }
    } catch (err) {
      console.error('Failed to fetch spine tracker:', err);
      setSaveStatus('unsaved');
    }
  }, [boardId]);

  const saveData = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/boards/${boardId}/spine-tracker`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: stateRef.current, version: versionRef.current }),
      });
      const json = await res.json();
      if (json.success) {
        setVersion(json.data.version);
        setSaveStatus('saved');
      } else if (res.status === 409) {
        setSaveStatus('conflict');
      } else {
        console.error('Failed to save:', json.error);
        setSaveStatus('unsaved');
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveStatus('unsaved');
    }
  }, [boardId]);

  const scheduleSave = useCallback(() => {
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveData();
    }, AUTO_SAVE_DELAY);
  }, [saveData]);

  // Load data on mount
  useEffect(() => {
    const hasCachedSession = spineTrackerSessionCache.has(boardId);
    void fetchData({ background: hasCachedSession });
    fetchSpineMeta();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [boardId, fetchData, fetchSpineMeta]);

  // ============== STATE UPDATERS ==============

  const updateState = useCallback(
    (updater: (prev: SpineTrackerState) => SpineTrackerState) => {
      setState((prev) => {
        const next = updater(prev);
        return next;
      });
      scheduleSave();
    },
    [scheduleSave]
  );

  // ============== SKELETON OPERATIONS ==============

  const addSkeleton = useCallback(
    (overrides?: Partial<Skeleton>) => {
      const skeleton = createSkeleton(overrides);
      updateState((prev) => ({
        ...prev,
        skeletons: [...prev.skeletons, skeleton],
      }));
      setSelectedSkeletonId(skeleton.id);
      setEditMode(true);
      return skeleton.id;
    },
    [updateState]
  );

  const updateSkeleton = useCallback(
    (id: string, updates: Partial<Skeleton>) => {
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      }));
    },
    [updateState]
  );

  const deleteSkeleton = useCallback(
    (id: string) => {
      const skeleton = stateRef.current.skeletons.find((s) => s.id === id);
      if (skeleton?.isLayoutTemplate) return false;
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.filter((s) => s.id !== id),
      }));
      if (selectedSkeletonId === id) setSelectedSkeletonId(null);
      return true;
    },
    [updateState, selectedSkeletonId]
  );

  const duplicateSkeleton = useCallback(
    (id: string) => {
      const skeleton = stateRef.current.skeletons.find((s) => s.id === id);
      if (!skeleton) return null;
      const dupe = createSkeleton({
        ...skeleton,
        id: undefined,
        name: `${skeleton.name}_COPY`,
        isLayoutTemplate: false,
      });
      updateState((prev) => ({
        ...prev,
        skeletons: [...prev.skeletons, dupe],
      }));
      setSelectedSkeletonId(dupe.id);
      return dupe.id;
    },
    [updateState]
  );

  // ============== ANIMATION OPERATIONS ==============

  const addAnimation = useCallback(
    (skeletonId: string, overrides?: Partial<Animation>) => {
      const anim = createAnimation(overrides);
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((s) =>
          s.id === skeletonId ? { ...s, animations: [...s.animations, anim] } : s
        ),
      }));
    },
    [updateState]
  );

  const updateAnimation = useCallback(
    (skeletonId: string, animIndex: number, updates: Partial<Animation>) => {
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((s) =>
          s.id === skeletonId
            ? {
                ...s,
                animations: s.animations.map((a, i) => (i === animIndex ? { ...a, ...updates } : a)),
              }
            : s
        ),
      }));
    },
    [updateState]
  );

  const deleteAnimation = useCallback(
    (skeletonId: string, animIndex: number) => {
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((s) =>
          s.id === skeletonId
            ? { ...s, animations: s.animations.filter((_, i) => i !== animIndex) }
            : s
        ),
      }));
    },
    [updateState]
  );

  // ============== SOUND FX OPERATIONS ==============

  const addSoundFx = useCallback(
    (skeletonId: string, animIndex: number) => {
      const sfx: SoundFx = { file: 'sound.mp3', trigger: 'spine_event', volume: 1.0, notes: '' };
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((s) =>
          s.id === skeletonId
            ? {
                ...s,
                animations: s.animations.map((a, i) =>
                  i === animIndex ? { ...a, soundFx: [...(a.soundFx || []), sfx] } : a
                ),
              }
            : s
        ),
      }));
    },
    [updateState]
  );

  const updateSoundFx = useCallback(
    (skeletonId: string, animIndex: number, sfxIndex: number, updates: Partial<SoundFx>) => {
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((s) =>
          s.id === skeletonId
            ? {
                ...s,
                animations: s.animations.map((a, i) =>
                  i === animIndex
                    ? {
                        ...a,
                        soundFx: a.soundFx.map((sfx, j) =>
                          j === sfxIndex ? { ...sfx, ...updates } : sfx
                        ),
                      }
                    : a
                ),
              }
            : s
        ),
      }));
    },
    [updateState]
  );

  const deleteSoundFx = useCallback(
    (skeletonId: string, animIndex: number, sfxIndex: number) => {
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((s) =>
          s.id === skeletonId
            ? {
                ...s,
                animations: s.animations.map((a, i) =>
                  i === animIndex
                    ? { ...a, soundFx: a.soundFx.filter((_, j) => j !== sfxIndex) }
                    : a
                ),
              }
            : s
        ),
      }));
    },
    [updateState]
  );

  // ============== SKIN OPERATIONS ==============

  const addSkin = useCallback(
    (skeletonId: string) => {
      const skin: Skin = { name: 'new_skin', status: 'planned', notes: '' };
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((s) =>
          s.id === skeletonId ? { ...s, skins: [...s.skins, skin] } : s
        ),
      }));
    },
    [updateState]
  );

  const updateSkin = useCallback(
    (skeletonId: string, skinIndex: number, updates: Partial<Skin>) => {
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((s) =>
          s.id === skeletonId
            ? {
                ...s,
                skins: s.skins.map((sk, i) => (i === skinIndex ? { ...sk, ...updates } : sk)),
              }
            : s
        ),
      }));
    },
    [updateState]
  );

  const deleteSkin = useCallback(
    (skeletonId: string, skinIndex: number) => {
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((s) =>
          s.id === skeletonId ? { ...s, skins: s.skins.filter((_, i) => i !== skinIndex) } : s
        ),
      }));
    },
    [updateState]
  );

  // ============== EVENT OPERATIONS ==============

  const addEvent = useCallback(
    (skeletonId: string) => {
      const evt: SpineEvent = { name: 'new_event', animation: '', notes: '' };
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((s) =>
          s.id === skeletonId ? { ...s, events: [...s.events, evt] } : s
        ),
      }));
    },
    [updateState]
  );

  const updateEvent = useCallback(
    (skeletonId: string, eventIndex: number, updates: Partial<SpineEvent>) => {
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((s) =>
          s.id === skeletonId
            ? {
                ...s,
                events: s.events.map((e, i) => (i === eventIndex ? { ...e, ...updates } : e)),
              }
            : s
        ),
      }));
    },
    [updateState]
  );

  const deleteEvent = useCallback(
    (skeletonId: string, eventIndex: number) => {
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((s) =>
          s.id === skeletonId ? { ...s, events: s.events.filter((_, i) => i !== eventIndex) } : s
        ),
      }));
    },
    [updateState]
  );

  // ============== GROUP OPERATIONS ==============

  const toggleGroupCollapse = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const setGroupOrder = useCallback(
    (order: string[]) => {
      updateState((prev) => ({ ...prev, groupOrder: order }));
    },
    [updateState]
  );

  const addCustomGroup = useCallback(
    (label: string) => {
      const trimmedLabel = label.trim();
      if (!trimmedLabel) return null;

      const baseId = trimmedLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'group';

      let createdGroupId: string | null = null;

      updateState((prev) => {
        const existingIds = new Set(prev.groupOrder);
        let nextId = baseId;
        let suffix = 2;
        while (existingIds.has(nextId)) {
          nextId = `${baseId}_${suffix}`;
          suffix += 1;
        }

        createdGroupId = nextId;

        return {
          ...prev,
          groupOrder: [...prev.groupOrder, nextId],
          customGroups: {
            ...prev.customGroups,
            [nextId]: trimmedLabel,
          },
        };
      });

      if (createdGroupId) {
        setCollapsedGroups((prev) => {
          const next = new Set(prev);
          next.delete(createdGroupId!);
          return next;
        });
      }

      return createdGroupId;
    },
    [updateState]
  );

  const moveSkeletonToGroup = useCallback(
    (skeletonId: string, groupId: string) => {
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((skeleton) =>
          skeleton.id === skeletonId ? { ...skeleton, group: groupId } : skeleton
        ),
      }));
    },
    [updateState]
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      if (groupId === 'other') return;

      let movedCount = 0;
      let didDelete = false;

      updateState((prev) => {
        if (!prev.customGroups[groupId]) {
          return prev;
        }

        const nextSkeletons = prev.skeletons.map((skeleton) => {
          if (skeleton.group !== groupId) return skeleton;
          movedCount += 1;
          return { ...skeleton, group: 'other' };
        });

        didDelete = true;

        return {
          ...prev,
          skeletons: nextSkeletons,
          groupOrder: prev.groupOrder.filter((id) => id !== groupId),
          customGroups: Object.fromEntries(
            Object.entries(prev.customGroups).filter(([key]) => key !== groupId)
          ),
        };
      });

      if (didDelete && movedCount > 0) {
        setCollapsedGroups((prev) => {
          const next = new Set(prev);
          next.delete('other');
          return next;
        });
      }
    },
    [updateState]
  );

  // ============== BASELINE / CHANGELOG ==============

  const setBaseline = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      baseline: { skeletons: JSON.parse(JSON.stringify(prev.skeletons)) },
    }));
  }, [updateState]);

  const changelog = generateChangelog(state, state.baseline);

  // ============== SELECTION ==============

  const selectSkeleton = useCallback(
    (id: string | null) => {
      setSelectedSkeletonId(id);
      if (id) {
        const skeleton = stateRef.current.skeletons.find((s) => s.id === id);
        if (skeleton) {
          // Expand the skeleton's group
          setCollapsedGroups((prev) => {
            const next = new Set(prev);
            next.delete(skeleton.group || 'other');
            return next;
          });
        }
      }
    },
    []
  );

  const selectedSkeleton = state.skeletons.find((s) => s.id === selectedSkeletonId) || null;

  const buildSkeletonFromModule = useCallback(
    (asset: SpineDiscoveredAsset, module?: SpineSkeletonModule): Skeleton => {
      const name = asset.name;
      if (!module) {
        const overrides: Partial<Skeleton> = {
          name,
          group: getGroupForSkeleton(name),
          skins: asset.skins,
          events: asset.events,
          previewImageDataUrl: asset.previewImageDataUrl,
        };

        if (asset.animations.length > 0) {
          overrides.animations = asset.animations;
        }

        return createSkeleton(overrides);
      }

      const fallback = createSkeleton({
        name,
        group: module.group || getGroupForSkeleton(name),
      });

      return {
        ...fallback,
        status: module.status,
        zOrder: module.zOrder,
        description: module.description || '',
        placement: {
          parent: module.placementParent,
          bone: module.placementBone,
          notes: module.placementNotes || '',
        },
        animations:
          asset.animations.length > 0
            ? asset.animations
            : module.animations.length > 0
              ? module.animations
              : fallback.animations,
        skins: asset.skins.length > 0 ? asset.skins : module.skins,
        events: asset.events.length > 0 ? asset.events : module.events,
        previewImageDataUrl: asset.previewImageDataUrl,
        generalNotes: module.generalNotes || '',
      };
    },
    []
  );

  const mergeAnimationsForExistingSkeleton = useCallback(
    (existingAnimations: Animation[], discoveredAnimations: Animation[]) => {
      const discoveredMap = new Map(
        discoveredAnimations.map((animation) => [animation.name.toUpperCase(), animation])
      );

      const mergedExisting = existingAnimations.map((animation) => {
        const discovered = discoveredMap.get(animation.name.toUpperCase());
        if (!discovered) return animation;
        return {
          ...animation,
          track: discovered.track,
        };
      });

      const existingNames = new Set(mergedExisting.map((animation) => animation.name.toUpperCase()));
      const appended = discoveredAnimations.filter(
        (animation) => !existingNames.has(animation.name.toUpperCase())
      );

      return [...mergedExisting, ...appended];
    },
    []
  );

  const mergeSkinsForExistingSkeleton = useCallback(
    (existingSkins: Skin[], discoveredSkins: Skin[]) => {
      const existingMap = new Map(
        existingSkins.map((skin) => [skin.name.toUpperCase(), skin])
      );
      const discoveredNames = new Set(discoveredSkins.map((skin) => skin.name.toUpperCase()));

      const merged = discoveredSkins.map((skin) => {
        const existing = existingMap.get(skin.name.toUpperCase());
        if (!existing) return skin;
        return {
          ...skin,
          status: existing.status,
          notes: existing.notes,
        };
      });

      const extras = existingSkins.filter((skin) => !discoveredNames.has(skin.name.toUpperCase()));
      return [...merged, ...extras];
    },
    []
  );

  const mergeEventsForExistingSkeleton = useCallback(
    (existingEvents: SpineEvent[], discoveredEvents: SpineEvent[]) => {
      const existingMap = new Map(
        existingEvents.map((eventItem) => [
          `${eventItem.animation.toUpperCase()}::${eventItem.name.toUpperCase()}`,
          eventItem,
        ])
      );

      const discoveredKeys = new Set<string>();
      const merged = discoveredEvents.map((eventItem) => {
        const key = `${eventItem.animation.toUpperCase()}::${eventItem.name.toUpperCase()}`;
        discoveredKeys.add(key);
        const existing = existingMap.get(key);
        if (!existing) return eventItem;
        return {
          ...eventItem,
          notes: existing.notes || eventItem.notes,
        };
      });

      const extras = existingEvents.filter((eventItem) => {
        const key = `${eventItem.animation.toUpperCase()}::${eventItem.name.toUpperCase()}`;
        return !discoveredKeys.has(key);
      });

      return [...merged, ...extras];
    },
    []
  );

  const mergeExistingSkeletonWithDiscoveredAsset = useCallback(
    (existingSkeleton: Skeleton, asset: SpineDiscoveredAsset): Skeleton => {
      const mergedAnimations = mergeAnimationsForExistingSkeleton(
        existingSkeleton.animations,
        asset.animations
      );
      const mergedSkins = mergeSkinsForExistingSkeleton(existingSkeleton.skins, asset.skins);
      const mergedEvents = mergeEventsForExistingSkeleton(existingSkeleton.events, asset.events);

      return {
        ...existingSkeleton,
        animations: mergedAnimations,
        skins: mergedSkins,
        events: mergedEvents,
        previewImageDataUrl: asset.previewImageDataUrl || existingSkeleton.previewImageDataUrl || null,
      };
    },
    [mergeAnimationsForExistingSkeleton, mergeEventsForExistingSkeleton, mergeSkinsForExistingSkeleton]
  );

  const addSkeletonsFromDiscoveredAssets = useCallback(
    (assets: SpineDiscoveredAsset[]) => {
      const normalizedAssets: SpineDiscoveredAsset[] = [];
      const seenNames = new Set<string>();

      for (const asset of assets) {
        const normalizedName = asset.name
          .trim()
          .replace(/\.(json|png)$/i, '')
          .toUpperCase();
        if (!normalizedName || seenNames.has(normalizedName)) continue;
        seenNames.add(normalizedName);
        normalizedAssets.push({
          ...asset,
          name: normalizedName,
        });
      }

      const moduleMap = new Map(
        spineModules.map((module) => [module.skeletonName.toUpperCase(), module])
      );

      let firstAddedSkeletonId: string | null = null;
      let addedCount = 0;
      let updatedCount = 0;
      let conflictCount = 0;
      let hasChanges = false;

      updateState((prev) => {
        const nextSkeletons = [...prev.skeletons];
        const skeletonIndexByName = new Map(
          nextSkeletons.map((skeleton, index) => [skeleton.name.toUpperCase(), index])
        );

        for (const asset of normalizedAssets) {
          const name = asset.name;
          const existingIndex = skeletonIndexByName.get(name);

          if (existingIndex !== undefined) {
            conflictCount += 1;
            const existingSkeleton = nextSkeletons[existingIndex];
            nextSkeletons[existingIndex] = mergeExistingSkeletonWithDiscoveredAsset(
              existingSkeleton,
              asset
            );
            updatedCount += 1;
            hasChanges = true;
            continue;
          }

          const matchedModule = moduleMap.get(name);
          const newSkeleton = buildSkeletonFromModule(asset, matchedModule);
          nextSkeletons.push(newSkeleton);
          skeletonIndexByName.set(name, nextSkeletons.length - 1);
          if (!firstAddedSkeletonId) firstAddedSkeletonId = newSkeleton.id;
          addedCount += 1;
          hasChanges = true;
        }

        if (!hasChanges) return prev;

        return {
          ...prev,
          skeletons: nextSkeletons,
        };
      });

      if (firstAddedSkeletonId) {
        setSelectedSkeletonId(firstAddedSkeletonId);
      }

      return {
        addedCount,
        updatedCount,
        conflictCount,
      };
    },
    [buildSkeletonFromModule, mergeExistingSkeletonWithDiscoveredAsset, spineModules, updateState]
  );

  // ============== IMPORT / EXPORT ==============

  const importJSON = useCallback(
    async (file: File) => {
      const text = await file.text();
      try {
        const parsed = JSON.parse(text);
        const res = await fetch(`/api/boards/${boardId}/spine-tracker/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: parsed }),
        });
        const json = await res.json();
        if (json.success) {
          await fetchData(); // Reload from server
          return { success: true, count: json.data.skeletonCount };
        }
        return { success: false, error: json.error?.message || 'Import failed' };
      } catch {
        return { success: false, error: 'Invalid JSON file' };
      }
    },
    [boardId, fetchData]
  );

  const exportJSON = useCallback(() => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spine-tracker.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const exportMarkdown = useCallback(() => {
    const md = exportAsMarkdown(state);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SPINE_TRACKER.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const exportChangelog = useCallback(() => {
    const cl = generateChangelog(state, state.baseline);
    if (!cl.hasChanges) return false;
    const md = exportChangelogAsMarkdown(cl);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spine-changes.md';
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }, [state]);

  // ============== CONFLICT RESOLUTION ==============

  const resolveConflict = useCallback(
    async (strategy: 'overwrite' | 'reload') => {
      if (strategy === 'reload') {
        await fetchData();
      } else {
        // Force save by fetching current version first
        const res = await fetch(`/api/boards/${boardId}/spine-tracker`);
        const json = await res.json();
        if (json.success) {
          setVersion(json.data.version);
          // Now save with correct version
          await saveData();
        }
      }
    },
    [boardId, fetchData, saveData]
  );

  // ============== PROJECT NAME ==============

  const setProjectName = useCallback(
    (name: string) => {
      updateState((prev) => ({ ...prev, projectName: name }));
    },
    [updateState]
  );

  const updateFinalAssetsPath = useCallback(async (path: string | null) => {
    setIsUpdatingFinalAssetsPath(true);
    try {
      const response = await fetch(`/api/me/spine-settings?boardId=${encodeURIComponent(boardId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalAssetsPath: path }),
      });
      const payload = await response.json();

      if (!payload.success) {
        return {
          success: false as const,
          error: payload.error?.message || 'Failed to update Final Assets path',
        };
      }

      setFinalAssetsPath(payload.data?.finalAssetsPath ?? null);
      return {
        success: true as const,
      };
    } catch (error) {
      console.error('Failed to update Final Assets path:', error);
      return {
        success: false as const,
        error: 'Failed to update Final Assets path',
      };
    } finally {
      setIsUpdatingFinalAssetsPath(false);
    }
  }, [boardId]);

  return {
    // State
    state,
    version,
    saveStatus,
    selectedSkeleton,
    selectedSkeletonId,
    editMode,
    searchQuery,
    collapsedGroups,
    changelog,
    spineModules,
    availableTaskOptions,
    finalAssetsPath,
    isUpdatingFinalAssetsPath,
    showGenericSkeletons,

    // Setters
    setEditMode,
    setSearchQuery,
    setProjectName,
    updateFinalAssetsPath,
    setShowGenericSkeletons,

    // Skeleton ops
    addSkeleton,
    updateSkeleton,
    deleteSkeleton,
    duplicateSkeleton,
    selectSkeleton,
    addSkeletonsFromDiscoveredAssets,

    // Animation ops
    addAnimation,
    updateAnimation,
    deleteAnimation,

    // Sound FX ops
    addSoundFx,
    updateSoundFx,
    deleteSoundFx,

    // Skin ops
    addSkin,
    updateSkin,
    deleteSkin,

    // Event ops
    addEvent,
    updateEvent,
    deleteEvent,

    // Group ops
    toggleGroupCollapse,
    setGroupOrder,
    addCustomGroup,
    moveSkeletonToGroup,
    deleteGroup,

    // Baseline / changelog
    setBaseline,

    // Import / Export
    importJSON,
    exportJSON,
    exportMarkdown,
    exportChangelog,

    // Sync
    resolveConflict,
    reload: fetchData,
    forceSave: saveData,
  };
}
