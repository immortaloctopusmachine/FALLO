'use client';

import { useRef } from 'react';
import { Download, Upload, FileText, FileJson, Milestone, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { SaveStatus } from '@/types/spine-tracker';

interface SpineTrackerHeaderProps {
  projectName: string;
  skeletonCount: number;
  saveStatus: SaveStatus;
  hasBaseline: boolean;
  onSetBaseline: () => void;
  onExportJSON: () => void;
  onExportMarkdown: () => void;
  onExportChangelog: () => boolean;
  onImportJSON: (file: File) => Promise<{ success: boolean; count?: number; error?: string }>;
  onResolveConflict: (strategy: 'overwrite' | 'reload') => void;
  onForceSave: () => void;
}

const STATUS_DISPLAY: Record<SaveStatus, { label: string; className: string }> = {
  saved: { label: 'Saved', className: 'text-emerald-400' },
  saving: { label: 'Saving...', className: 'text-amber-400' },
  unsaved: { label: 'Unsaved', className: 'text-amber-400' },
  conflict: { label: 'Conflict', className: 'text-red-400' },
  loading: { label: 'Loading...', className: 'text-text-tertiary' },
};

export function SpineTrackerHeader({
  projectName,
  skeletonCount,
  saveStatus,
  hasBaseline,
  onSetBaseline,
  onExportJSON,
  onExportMarkdown,
  onExportChangelog,
  onImportJSON,
  onResolveConflict,
  onForceSave,
}: SpineTrackerHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await onImportJSON(file);
      if (result.success) {
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        alert(result.error || 'Import failed');
      }
    }
  };

  const status = STATUS_DISPLAY[saveStatus];

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-caption font-semibold text-text-primary">
          Spine Tracker {projectName && `— ${projectName}`}
        </h2>
        <span className="text-xs text-text-tertiary">
          {skeletonCount} skeletons
        </span>
        <span className={`text-xs ${status.className}`}>{status.label}</span>
      </div>

      <div className="flex items-center gap-1">
        {/* Conflict resolution */}
        {saveStatus === 'conflict' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-caption text-red-400">
                <AlertTriangle className="h-3 w-3" /> Conflict
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Save Conflict</AlertDialogTitle>
                <AlertDialogDescription>
                  Another user has modified this Spine Tracker. You can overwrite their changes with yours,
                  or reload to see their version.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => onResolveConflict('reload')}>
                  Reload Their Version
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => onResolveConflict('overwrite')}>
                  Overwrite with Mine
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Baseline */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-caption"
          onClick={onSetBaseline}
          title="Set baseline for change tracking"
        >
          <Milestone className="h-3 w-3" />
          {hasBaseline ? 'Reset Baseline' : 'Set Baseline'}
        </Button>

        {/* Export Changelog */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-caption"
          onClick={() => {
            const hasChanges = onExportChangelog();
            if (!hasChanges) alert('No changes since baseline');
          }}
          disabled={!hasBaseline}
          title="Export changelog"
        >
          <FileText className="h-3 w-3" /> Changes
        </Button>

        {/* Export MD */}
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-caption" onClick={onExportMarkdown} title="Export as Markdown">
          <Download className="h-3 w-3" /> MD
        </Button>

        {/* Export JSON */}
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-caption" onClick={onExportJSON} title="Export as JSON">
          <FileJson className="h-3 w-3" /> JSON
        </Button>

        {/* Import JSON */}
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-caption" onClick={handleImportClick} title="Import JSON">
          <Upload className="h-3 w-3" /> Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Force save */}
        {saveStatus === 'unsaved' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-amber-400 hover:text-amber-300"
            onClick={onForceSave}
            title="Save now"
          >
            <Save className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
