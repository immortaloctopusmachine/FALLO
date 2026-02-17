'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSpineTracker } from '@/hooks/useSpineTracker';
import { SpineTrackerHeader } from './SpineTrackerHeader';
import { SkeletonNavigator } from './SkeletonNavigator';
import { SkeletonEditor } from './SkeletonEditor';
import { ReferencePanel } from './ReferencePanel';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { SpineDiscoveredAsset } from '@/types/spine-tracker';

interface SpineDiscoveryFile {
  asset: SpineDiscoveredAsset;
  isConflict: boolean;
}

interface SpineTrackerViewProps {
  boardId: string;
}

export function SpineTrackerView({ boardId }: SpineTrackerViewProps) {
  const tracker = useSpineTracker({ boardId });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDiscoveryDialogOpen, setIsDiscoveryDialogOpen] = useState(false);
  const [discoveredFiles, setDiscoveredFiles] = useState<SpineDiscoveryFile[]>([]);
  const [selectedDiscoveredNames, setSelectedDiscoveredNames] = useState<Set<string>>(new Set());

  const discoverySummary = useMemo(() => {
    const newCount = discoveredFiles.filter((file) => !file.isConflict).length;
    const conflictCount = discoveredFiles.length - newCount;
    return { newCount, conflictCount };
  }, [discoveredFiles]);

  const newDiscoveredFiles = useMemo(
    () => discoveredFiles.filter((file) => !file.isConflict),
    [discoveredFiles]
  );

  const conflictingDiscoveredFiles = useMemo(
    () => discoveredFiles.filter((file) => file.isConflict),
    [discoveredFiles]
  );

  const animationStats = useMemo(() => {
    const byStatus = {
      planned: 0,
      ready_to_be_implemented: 0,
      implemented: 0,
      not_as_intended: 0,
    } as const;

    const mutableByStatus = { ...byStatus };
    let total = 0;

    for (const skeleton of tracker.state.skeletons) {
      for (const animation of skeleton.animations) {
        total += 1;
        if (animation.status in mutableByStatus) {
          mutableByStatus[animation.status as keyof typeof mutableByStatus] += 1;
        }
      }
    }

    return {
      total,
      byStatus: mutableByStatus,
    };
  }, [tracker.state.skeletons]);

  const handleDeleteSkeleton = useCallback(
    (id: string) => {
      const skeleton = tracker.state.skeletons.find((s) => s.id === id);
      if (skeleton?.isLayoutTemplate) return;
      setDeleteTarget(id);
    },
    [tracker.state.skeletons]
  );

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      tracker.deleteSkeleton(deleteTarget);
      setDeleteTarget(null);
    }
  }, [deleteTarget, tracker]);

  const handleSkeletonClickByName = useCallback(
    (name: string) => {
      const skeleton = tracker.state.skeletons.find((s) => s.name === name);
      if (skeleton) tracker.selectSkeleton(skeleton.id);
    },
    [tracker]
  );

  const handleSearchSpineFilesDiscovered = useCallback(
    (assets: SpineDiscoveredAsset[]) => {
      const uniqueAssetsMap = new Map<string, SpineDiscoveredAsset>();

      for (const asset of assets) {
        const normalizedName = asset.name.trim().replace(/\.(json|png)$/i, '').toUpperCase();
        if (!normalizedName) continue;

        if (!uniqueAssetsMap.has(normalizedName)) {
          uniqueAssetsMap.set(normalizedName, {
            ...asset,
            name: normalizedName,
          });
        }
      }

      const normalizedAssets = Array.from(uniqueAssetsMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      const existingNames = new Set(
        tracker.state.skeletons.map((skeleton) => skeleton.name.toUpperCase())
      );

      const nextDiscoveredFiles: SpineDiscoveryFile[] = normalizedAssets.map((asset) => ({
        asset,
        isConflict: existingNames.has(asset.name),
      }));

      const preselected = new Set(
        nextDiscoveredFiles
          .filter((file) => !file.isConflict)
          .map((file) => file.asset.name)
      );

      setDiscoveredFiles(nextDiscoveredFiles);
      setSelectedDiscoveredNames(preselected);
      setIsDiscoveryDialogOpen(true);
    },
    [tracker.state.skeletons]
  );

  const handleToggleDiscoveredFile = useCallback((name: string, checked: boolean) => {
    setSelectedDiscoveredNames((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  }, []);

  const handleAddSelectedAsNewEntries = useCallback(() => {
    const selectedAssets = discoveredFiles
      .filter((file) => selectedDiscoveredNames.has(file.asset.name))
      .map((file) => file.asset);

    if (selectedAssets.length === 0) {
      alert('Select at least one file to add.');
      return;
    }

    const result = tracker.addSkeletonsFromDiscoveredAssets(selectedAssets);

    setIsDiscoveryDialogOpen(false);
    setDiscoveredFiles([]);
    setSelectedDiscoveredNames(new Set());

    const messages: string[] = [];
    if (result.addedCount > 0) {
      messages.push(
        `Added ${result.addedCount} new entr${result.addedCount === 1 ? 'y' : 'ies'}.`
      );
    }
    if (result.updatedCount > 0) {
      messages.push(
        `Updated ${result.updatedCount} existing entr${result.updatedCount === 1 ? 'y' : 'ies'} with latest preview/metadata.`
      );
    }

    if (messages.length === 0) {
      alert('No entries were changed.');
      return;
    }

    alert(messages.join(' '));
  }, [discoveredFiles, selectedDiscoveredNames, tracker]);

  const handleSelectAllDiscovered = useCallback(() => {
    setSelectedDiscoveredNames(
      new Set(discoveredFiles.map((file) => file.asset.name))
    );
  }, [discoveredFiles]);

  const handleDeselectAllDiscovered = useCallback(() => {
    setSelectedDiscoveredNames(new Set());
  }, []);

  const handleCloseDiscoveryDialog = useCallback(() => {
    setIsDiscoveryDialogOpen(false);
    setDiscoveredFiles([]);
    setSelectedDiscoveredNames(new Set());
  }, []);

  if (tracker.saveStatus === 'loading') {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <p className="text-text-tertiary">Loading Spine Tracker...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <SpineTrackerHeader
        projectName={tracker.state.projectName}
        skeletonCount={tracker.state.skeletons.length}
        animationStats={animationStats}
        saveStatus={tracker.saveStatus}
        hasBaseline={!!tracker.state.baseline}
        onSetBaseline={tracker.setBaseline}
        onExportJSON={tracker.exportJSON}
        onExportMarkdown={tracker.exportMarkdown}
        onExportChangelog={tracker.exportChangelog}
        onImportJSON={tracker.importJSON}
        onResolveConflict={tracker.resolveConflict}
        onForceSave={tracker.forceSave}
        finalAssetsPath={tracker.finalAssetsPath}
        isUpdatingFinalAssetsPath={tracker.isUpdatingFinalAssetsPath}
        onUpdateFinalAssetsPath={tracker.updateFinalAssetsPath}
        onSearchSpineFilesDiscovered={handleSearchSpineFilesDiscovered}
      />

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Navigator */}
        <div className="w-64 shrink-0">
          <SkeletonNavigator
            skeletons={tracker.state.skeletons}
            customGroups={tracker.state.customGroups}
            groupOrder={tracker.state.groupOrder}
            selectedSkeletonId={tracker.selectedSkeletonId}
            collapsedGroups={tracker.collapsedGroups}
            searchQuery={tracker.searchQuery}
            showGenericSkeletons={tracker.showGenericSkeletons}
            onSearchChange={tracker.setSearchQuery}
            onToggleShowGenericSkeletons={tracker.setShowGenericSkeletons}
            onSelectSkeleton={tracker.selectSkeleton}
            onAddSkeleton={() => tracker.addSkeleton()}
            onAddCustomGroup={tracker.addCustomGroup}
            onDeleteGroup={tracker.deleteGroup}
            onMoveSkeletonToGroup={tracker.moveSkeletonToGroup}
            onDuplicateSkeleton={tracker.duplicateSkeleton}
            onDeleteSkeleton={handleDeleteSkeleton}
            onToggleGroup={tracker.toggleGroupCollapse}
          />
        </div>

        {/* Center: Editor */}
        <div className="flex-1 min-w-0">
          {tracker.selectedSkeleton ? (
            <SkeletonEditor
              skeleton={tracker.selectedSkeleton}
              allSkeletons={tracker.state.skeletons}
              editMode={tracker.editMode}
              onSetEditMode={tracker.setEditMode}
              onUpdate={(updates) => tracker.updateSkeleton(tracker.selectedSkeletonId!, updates)}
              groupOrder={tracker.state.groupOrder}
              customGroups={tracker.state.customGroups}
              availableTaskOptions={tracker.availableTaskOptions}
              onAddAnimation={() => tracker.addAnimation(tracker.selectedSkeletonId!)}
              onUpdateAnimation={(i, updates) => tracker.updateAnimation(tracker.selectedSkeletonId!, i, updates)}
              onDeleteAnimation={(i) => tracker.deleteAnimation(tracker.selectedSkeletonId!, i)}
              onAddSoundFx={(i) => tracker.addSoundFx(tracker.selectedSkeletonId!, i)}
              onUpdateSoundFx={(ai, si, updates) => tracker.updateSoundFx(tracker.selectedSkeletonId!, ai, si, updates)}
              onDeleteSoundFx={(ai, si) => tracker.deleteSoundFx(tracker.selectedSkeletonId!, ai, si)}
              onAddSkin={() => tracker.addSkin(tracker.selectedSkeletonId!)}
              onUpdateSkin={(i, updates) => tracker.updateSkin(tracker.selectedSkeletonId!, i, updates)}
              onDeleteSkin={(i) => tracker.deleteSkin(tracker.selectedSkeletonId!, i)}
              onAddEvent={() => tracker.addEvent(tracker.selectedSkeletonId!)}
              onUpdateEvent={(i, updates) => tracker.updateEvent(tracker.selectedSkeletonId!, i, updates)}
              onDeleteEvent={(i) => tracker.deleteEvent(tracker.selectedSkeletonId!, i)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-text-tertiary mb-2">Select a skeleton from the left panel</p>
                <p className="text-xs text-text-tertiary">or add a new one with the + button</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Reference */}
        <div className="w-56 shrink-0">
          <ReferencePanel
            skeletons={tracker.state.skeletons}
            changelog={tracker.changelog}
            hasBaseline={!!tracker.state.baseline}
            onSkeletonClick={handleSkeletonClickByName}
          />
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Skeleton</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {tracker.state.skeletons.find((s) => s.id === deleteTarget)?.name}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDiscoveryDialogOpen} onOpenChange={(open) => !open && handleCloseDiscoveryDialog()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Spine Files Found</DialogTitle>
            <DialogDescription>
              New files are pre-selected. Conflicts are existing files that can be selected to update
              preview and metadata.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleSelectAllDiscovered}>
              Select all
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeselectAllDiscovered}>
              Deselect all
            </Button>
          </div>

          <div className="max-h-[420px] overflow-y-auto rounded-md border border-border-subtle">
            {discoveredFiles.length === 0 ? (
              <div className="p-4 text-sm text-text-secondary">No files found.</div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {newDiscoveredFiles.length > 0 ? (
                  <div>
                    <div className="bg-surface-hover px-3 py-2 text-xs font-medium uppercase tracking-wide text-emerald-300">
                      New Files
                    </div>
                    <div className="divide-y divide-border-subtle">
                      {newDiscoveredFiles.map((file) => (
                        <div key={file.asset.name} className="flex items-center justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">{file.asset.name}</p>
                            <p className="text-xs text-emerald-400">
                              New file - {file.asset.animations.length} anim, {file.asset.skins.length} skins, {file.asset.events.length} events
                            </p>
                          </div>
                          <Checkbox
                            checked={selectedDiscoveredNames.has(file.asset.name)}
                            onCheckedChange={(checked) =>
                              handleToggleDiscoveredFile(file.asset.name, checked === true)
                            }
                            aria-label={`Select ${file.asset.name}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {conflictingDiscoveredFiles.length > 0 ? (
                  <div>
                    <div className="bg-surface-hover px-3 py-2 text-xs font-medium uppercase tracking-wide text-amber-300">
                      Conflicting Files
                    </div>
                    <div className="divide-y divide-border-subtle">
                      {conflictingDiscoveredFiles.map((file) => (
                        <div key={file.asset.name} className="flex items-center justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">{file.asset.name}</p>
                            <p className="text-xs text-amber-400">
                              Conflict: already exists - {file.asset.animations.length} anim, {file.asset.skins.length} skins, {file.asset.events.length} events
                            </p>
                          </div>
                          <Checkbox
                            checked={selectedDiscoveredNames.has(file.asset.name)}
                            onCheckedChange={(checked) =>
                              handleToggleDiscoveredFile(file.asset.name, checked === true)
                            }
                            aria-label={`Select ${file.asset.name}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="text-xs text-text-secondary">
            Found {discoveredFiles.length} file{discoveredFiles.length === 1 ? '' : 's'}:
            {' '}
            {discoverySummary.newCount} new,
            {' '}
            {discoverySummary.conflictCount} conflicts.
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDiscoveryDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedAsNewEntries}
              disabled={selectedDiscoveredNames.size === 0}
            >
              Add Or Update Selected Entries
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
