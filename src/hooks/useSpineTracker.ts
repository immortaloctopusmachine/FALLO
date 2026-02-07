'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  Skeleton,
  Animation,
  SoundFx,
  Skin,
  SpineEvent,
  SpineTrackerState,
  SaveStatus,
} from '@/types/spine-tracker';
import {
  createEmptyState,
  createSkeleton,
  createAnimation,
  generateChangelog,
  exportAsMarkdown,
  exportChangelogAsMarkdown,
} from '@/components/spine-tracker/utils';

const AUTO_SAVE_DELAY = 1500; // ms

interface UseSpineTrackerOptions {
  boardId: string;
}

export function useSpineTracker({ boardId }: UseSpineTrackerOptions) {
  const [state, setState] = useState<SpineTrackerState>(createEmptyState());
  const [version, setVersion] = useState(1);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading');
  const [selectedSkeletonId, setSelectedSkeletonId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  const versionRef = useRef(version);

  // Keep refs in sync
  stateRef.current = state;
  versionRef.current = version;

  // ============== API COMMUNICATION ==============

  const fetchData = useCallback(async () => {
    setSaveStatus('loading');
    try {
      const res = await fetch(`/api/boards/${boardId}/spine-tracker`);
      const json = await res.json();
      if (json.success) {
        const data = json.data.data as SpineTrackerState;
        setState(data);
        setVersion(json.data.version);
        setSaveStatus('saved');
        // Collapse all groups initially
        if (data.groupOrder) {
          setCollapsedGroups(new Set(data.groupOrder));
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
    fetchData();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [fetchData]);

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

  const deleteGroup = useCallback(
    (groupId: string) => {
      updateState((prev) => ({
        ...prev,
        skeletons: prev.skeletons.map((s) => (s.group === groupId ? { ...s, group: 'other' } : s)),
        groupOrder: prev.groupOrder.filter((id) => id !== groupId),
        customGroups: Object.fromEntries(
          Object.entries(prev.customGroups).filter(([key]) => key !== groupId)
        ),
      }));
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

    // Setters
    setEditMode,
    setSearchQuery,
    setProjectName,

    // Skeleton ops
    addSkeleton,
    updateSkeleton,
    deleteSkeleton,
    duplicateSkeleton,
    selectSkeleton,

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
