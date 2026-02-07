'use client';

import { useCallback } from 'react';
import { useSpineTracker } from '@/hooks/useSpineTracker';
import { SpineTrackerHeader } from './SpineTrackerHeader';
import { SkeletonNavigator } from './SkeletonNavigator';
import { SkeletonEditor } from './SkeletonEditor';
import { ReferencePanel } from './ReferencePanel';
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
import { useState } from 'react';

interface SpineTrackerViewProps {
  boardId: string;
}

export function SpineTrackerView({ boardId }: SpineTrackerViewProps) {
  const tracker = useSpineTracker({ boardId });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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
        saveStatus={tracker.saveStatus}
        hasBaseline={!!tracker.state.baseline}
        onSetBaseline={tracker.setBaseline}
        onExportJSON={tracker.exportJSON}
        onExportMarkdown={tracker.exportMarkdown}
        onExportChangelog={tracker.exportChangelog}
        onImportJSON={tracker.importJSON}
        onResolveConflict={tracker.resolveConflict}
        onForceSave={tracker.forceSave}
      />

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Navigator */}
        <div className="w-64 shrink-0">
          <SkeletonNavigator
            skeletons={tracker.state.skeletons}
            groupOrder={tracker.state.groupOrder}
            selectedSkeletonId={tracker.selectedSkeletonId}
            collapsedGroups={tracker.collapsedGroups}
            searchQuery={tracker.searchQuery}
            onSearchChange={tracker.setSearchQuery}
            onSelectSkeleton={tracker.selectSkeleton}
            onAddSkeleton={() => tracker.addSkeleton()}
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
    </div>
  );
}
