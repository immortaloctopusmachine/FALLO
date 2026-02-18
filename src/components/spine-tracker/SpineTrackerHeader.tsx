'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Upload, FileText, FileJson, Milestone, Save, AlertTriangle, Search, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  Animation,
  SaveStatus,
  SkeletonStatus,
  Skin,
  SpineDiscoveredAsset,
  SpineEvent,
} from '@/types/spine-tracker';

interface SpineTrackerHeaderProps {
  projectName: string;
  skeletonCount: number;
  animationStats: {
    total: number;
    byStatus: Record<SkeletonStatus, number>;
  };
  saveStatus: SaveStatus;
  hasBaseline: boolean;
  finalAssetsPath: string | null;
  isUpdatingFinalAssetsPath: boolean;
  onSetBaseline: () => void;
  onExportJSON: () => void;
  onExportMarkdown: () => void;
  onExportChangelog: () => boolean;
  onImportJSON: (file: File) => Promise<{ success: boolean; count?: number; error?: string }>;
  onResolveConflict: (strategy: 'overwrite' | 'reload') => void;
  onForceSave: () => void;
  onUpdateFinalAssetsPath: (path: string | null) => Promise<{ success: boolean; error?: string }>;
  onSearchSpineFilesDiscovered: (assets: SpineDiscoveredAsset[]) => void;
}

const STATUS_DISPLAY: Record<SaveStatus, { label: string; className: string }> = {
  saved: { label: 'Saved', className: 'text-emerald-400' },
  saving: { label: 'Saving...', className: 'text-amber-400' },
  unsaved: { label: 'Unsaved', className: 'text-amber-400' },
  conflict: { label: 'Conflict', className: 'text-red-400' },
  loading: { label: 'Loading...', className: 'text-text-tertiary' },
};

type JsonMap = Record<string, unknown>;
type FolderFile = File & { webkitRelativePath?: string };
type PickerHandleLike = PickerDirectoryHandleLike | PickerFileHandleLike;
type PickerDirectoryHandleLike = {
  kind: 'directory';
  name: string;
  values: () => AsyncIterable<PickerHandleLike>;
};
type PickerFileHandleLike = {
  kind: 'file';
  name: string;
  getFile?: () => Promise<File>;
};

interface SpineCandidateFile {
  file: File;
  name: string;
  path: string;
}

const directoryInputProps = {
  webkitdirectory: 'true',
  directory: 'true',
} as unknown as React.InputHTMLAttributes<HTMLInputElement>;

const NO_SPINE_FILES_FOUND_MESSAGE =
  'No Spine JSON files were found under DESKTOP/SPINE_ASSETS in the selected folder.';

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').toUpperCase();
}

function asObject(value: unknown): JsonMap | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonMap;
}

function toSafeTrack(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(9, parsed));
}

function isPathInSpineAssets(path: string): boolean {
  const normalizedPath = normalizePath(path);
  return (
    normalizedPath === 'SPINE_ASSETS' ||
    normalizedPath.startsWith('SPINE_ASSETS/') ||
    normalizedPath.includes('/SPINE_ASSETS/')
  );
}

function looksLikeFinalAssetsPath(path: string | null): boolean {
  if (!path) return false;
  return normalizePath(path).includes('FINAL_ASSETS');
}

function getFileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx < 0) return '';
  return name.slice(idx).toLowerCase();
}

function getBaseName(name: string): string {
  return name.replace(/\.[^/.]+$/u, '').trim().toUpperCase();
}

function shouldIgnoreJsonBaseName(baseName: string): boolean {
  return baseName === 'ALL';
}

function shouldIgnorePngBaseName(baseName: string): boolean {
  return baseName.startsWith('SPINE_TEXTURES');
}

function extractSkins(rawSkins: unknown): Skin[] {
  const names = new Set<string>();

  if (Array.isArray(rawSkins)) {
    for (const entry of rawSkins) {
      const skinObj = asObject(entry);
      const rawName = typeof skinObj?.name === 'string' ? skinObj.name.trim() : '';
      if (rawName) names.add(rawName);
    }
  } else {
    const skinsObj = asObject(rawSkins);
    if (skinsObj) {
      for (const key of Object.keys(skinsObj)) {
        const trimmed = key.trim();
        if (trimmed) names.add(trimmed);
      }
    }
  }

  return Array.from(names)
    .filter((name) => name !== 'default')
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      status: 'planned',
      notes: '',
    }));
}

function extractAnimations(rawAnimations: unknown): Animation[] {
  const animationsObj = asObject(rawAnimations);
  if (!animationsObj) return [];

  const animations: Animation[] = [];

  for (const [name, value] of Object.entries(animationsObj)) {
    const animName = name.trim();
    if (!animName) continue;

    const animObj = asObject(value);
    const track = animObj
      ? toSafeTrack(animObj.track ?? asObject(animObj.meta)?.track)
      : 0;

    animations.push({
      name: animName,
      status: 'planned',
      track,
      notes: '',
      soundFx: [],
    });
  }

  return animations.sort((a, b) => a.name.localeCompare(b.name));
}

function extractEventCommentLookup(rawEvents: unknown): Map<string, string> {
  const lookup = new Map<string, string>();
  const eventsObj = asObject(rawEvents);
  if (!eventsObj) return lookup;

  for (const [eventName, rawValue] of Object.entries(eventsObj)) {
    const trimmedName = eventName.trim();
    if (!trimmedName) continue;
    const eventObj = asObject(rawValue);
    if (!eventObj) continue;
    const commentCandidate = [eventObj.comment, eventObj.notes, eventObj.note, eventObj.string].find(
      (value) => typeof value === 'string'
    );
    if (typeof commentCandidate === 'string' && commentCandidate.trim()) {
      lookup.set(trimmedName.toUpperCase(), commentCandidate.trim());
    }
  }

  return lookup;
}

function collectEventCandidates(rawEventsTimeline: unknown): JsonMap[] {
  const candidates: JsonMap[] = [];

  if (Array.isArray(rawEventsTimeline)) {
    for (const item of rawEventsTimeline) {
      const eventObj = asObject(item);
      if (eventObj) candidates.push(eventObj);
    }
    return candidates;
  }

  const eventsObj = asObject(rawEventsTimeline);
  if (!eventsObj) return candidates;

  for (const value of Object.values(eventsObj)) {
    if (Array.isArray(value)) {
      for (const nested of value) {
        const nestedObj = asObject(nested);
        if (nestedObj) candidates.push(nestedObj);
      }
      continue;
    }

    const valueObj = asObject(value);
    if (!valueObj) continue;

    if (typeof valueObj.name === 'string' || typeof valueObj.event === 'string') {
      candidates.push(valueObj);
      continue;
    }

    for (const nested of Object.values(valueObj)) {
      const nestedObj = asObject(nested);
      if (nestedObj) candidates.push(nestedObj);
    }
  }

  return candidates;
}

function extractEventsFromAnimations(
  rawAnimations: unknown,
  commentLookup: Map<string, string>
): SpineEvent[] {
  const animationsObj = asObject(rawAnimations);
  if (!animationsObj) return [];

  const eventMap = new Map<string, SpineEvent>();

  for (const [animationName, animationRaw] of Object.entries(animationsObj)) {
    const animation = animationName.trim();
    if (!animation) continue;

    const animationObj = asObject(animationRaw);
    if (!animationObj) continue;

    for (const eventObj of collectEventCandidates(animationObj.events)) {
      const eventName = typeof eventObj?.name === 'string' ? eventObj.name.trim() : '';
      const timelineEventName = typeof eventObj?.event === 'string' ? eventObj.event.trim() : '';
      const resolvedEventName = eventName || timelineEventName;
      if (!resolvedEventName) continue;

      const commentCandidate = [
        eventObj?.comment,
        eventObj?.notes,
        eventObj?.note,
        eventObj?.string,
      ].find((value) => typeof value === 'string');
      const resolvedFromLookup = commentLookup.get(resolvedEventName.toUpperCase()) || '';
      const notes = typeof commentCandidate === 'string' && commentCandidate.trim()
        ? commentCandidate.trim()
        : resolvedFromLookup;
      const key = `${animation.toUpperCase()}::${resolvedEventName.toUpperCase()}`;

      const existing = eventMap.get(key);
      if (!existing) {
        eventMap.set(key, {
          name: resolvedEventName,
          animation,
          notes,
        });
      } else if (!existing.notes && notes) {
        eventMap.set(key, { ...existing, notes });
      }
    }
  }

  return Array.from(eventMap.values()).sort((a, b) => {
    const byAnimation = a.animation.localeCompare(b.animation);
    if (byAnimation !== 0) return byAnimation;
    return a.name.localeCompare(b.name);
  });
}

function parseSpineJsonMetadata(jsonText: string): {
  animations: Animation[];
  events: SpineEvent[];
  skins: Skin[];
} {
  try {
    const parsed = JSON.parse(jsonText);
    const parsedObj = asObject(parsed);
    if (!parsedObj) {
      return { animations: [], skins: [], events: [] };
    }

    const animations = extractAnimations(parsedObj.animations);
    const skins = extractSkins(parsedObj.skins);
    const eventComments = extractEventCommentLookup(parsedObj.events);
    const events = extractEventsFromAnimations(parsedObj.animations, eventComments);

    return {
      animations,
      skins,
      events,
    };
  } catch {
    return { animations: [], skins: [], events: [] };
  }
}

async function createPreviewImageDataUrl(file: File): Promise<string | null> {
  const blobUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to decode preview image'));
      img.src = blobUrl;
    });

    const maxDimension = 320;
    const scale = Math.min(maxDimension / image.width, maxDimension / image.height, 1);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL('image/webp', 0.72);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function collectSpineCandidateFilesFromFileList(fileList: FileList): SpineCandidateFile[] {
  const files: SpineCandidateFile[] = [];

  for (const rawFile of Array.from(fileList)) {
    const file = rawFile as FolderFile;
    const relativePath = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
    const extension = getFileExtension(file.name);
    if (extension !== '.json' && extension !== '.png') continue;
    if (extension === '.json' && !isPathInSpineAssets(relativePath)) continue;

    const baseName = getBaseName(file.name);
    if (!baseName) continue;
    if (extension === '.json' && shouldIgnoreJsonBaseName(baseName)) continue;
    if (extension === '.png' && shouldIgnorePngBaseName(baseName)) continue;

    files.push({
      file,
      name: file.name,
      path: relativePath,
    });
  }

  return files;
}

async function collectSpineCandidateFilesFromDirectory(
  rootDirectory: PickerDirectoryHandleLike
): Promise<SpineCandidateFile[]> {
  const files: SpineCandidateFile[] = [];
  const stack: Array<{ handle: PickerDirectoryHandleLike; path: string }> = [
    { handle: rootDirectory, path: rootDirectory.name },
  ];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    for await (const entry of current.handle.values()) {
      const entryPath = `${current.path}/${entry.name}`.replace(/\\/g, '/');

      if (entry.kind === 'directory') {
        stack.push({
          handle: entry as PickerDirectoryHandleLike,
          path: entryPath,
        });
        continue;
      }

      const extension = getFileExtension(entry.name);
      if (extension !== '.json' && extension !== '.png') continue;
      if (extension === '.json' && !isPathInSpineAssets(entryPath)) continue;

      const baseName = getBaseName(entry.name);
      if (!baseName) continue;
      if (extension === '.json' && shouldIgnoreJsonBaseName(baseName)) continue;
      if (extension === '.png' && shouldIgnorePngBaseName(baseName)) continue;

      const fileHandle = entry as PickerFileHandleLike;
      if (typeof fileHandle.getFile !== 'function') continue;

      const file = await fileHandle.getFile();
      files.push({
        file,
        name: entry.name,
        path: entryPath,
      });
    }
  }

  return files;
}

function pickPreviewSourceFile(
  name: string,
  jsonFilePath: string,
  pngByName: Map<string, SpineCandidateFile[]>
): File | null {
  const pngCandidates = pngByName.get(name) || [];
  if (pngCandidates.length === 0) return null;

  const jsonDir = normalizePath(jsonFilePath).replace(/\/[^/]+$/u, '');
  const sameDirectory = pngCandidates.find((candidate) => {
    const candidateDir = normalizePath(candidate.path).replace(/\/[^/]+$/u, '');
    return candidateDir === jsonDir;
  });

  return (sameDirectory || pngCandidates[0]).file;
}

async function buildDiscoveredAssetsFromCandidateFiles(
  candidateFiles: SpineCandidateFile[]
): Promise<SpineDiscoveredAsset[]> {
  const jsonByName = new Map<string, SpineCandidateFile>();
  const pngByName = new Map<string, SpineCandidateFile[]>();

  for (const candidate of candidateFiles) {
    const name = getBaseName(candidate.name);
    if (!name) continue;

    const extension = getFileExtension(candidate.name);
    if (extension === '.json') {
      if (!jsonByName.has(name)) {
        jsonByName.set(name, candidate);
      }
      continue;
    }

    if (extension === '.png') {
      const existing = pngByName.get(name) || [];
      existing.push(candidate);
      pngByName.set(name, existing);
    }
  }

  const discoveredAssets: SpineDiscoveredAsset[] = [];
  const sortedJsonEntries = Array.from(jsonByName.entries()).sort(([a], [b]) => a.localeCompare(b));

  for (const [name, jsonCandidate] of sortedJsonEntries) {
    const jsonContent = await jsonCandidate.file.text();
    const metadata = parseSpineJsonMetadata(jsonContent);
    const previewSourceFile = pickPreviewSourceFile(name, jsonCandidate.path, pngByName);
    const previewImageDataUrl = previewSourceFile
      ? await createPreviewImageDataUrl(previewSourceFile)
      : null;

    discoveredAssets.push({
      name,
      animations: metadata.animations,
      skins: metadata.skins,
      events: metadata.events,
      previewImageDataUrl,
    });
  }

  return discoveredAssets;
}

export function SpineTrackerHeader({
  projectName,
  skeletonCount,
  animationStats,
  saveStatus,
  hasBaseline,
  finalAssetsPath,
  isUpdatingFinalAssetsPath,
  onSetBaseline,
  onExportJSON,
  onExportMarkdown,
  onExportChangelog,
  onImportJSON,
  onResolveConflict,
  onForceSave,
  onUpdateFinalAssetsPath,
  onSearchSpineFilesDiscovered,
}: SpineTrackerHeaderProps) {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isPathDialogOpen, setIsPathDialogOpen] = useState(false);
  const [pathInput, setPathInput] = useState('');

  useEffect(() => {
    setPathInput(finalAssetsPath || '');
  }, [finalAssetsPath]);

  const handleImportClick = () => {
    jsonInputRef.current?.click();
  };

  const handleSearchClick = async () => {
    const pickerApi = (
      window as Window & {
        showDirectoryPicker?: () => Promise<PickerDirectoryHandleLike>;
      }
    ).showDirectoryPicker;

    if (!pickerApi) {
      folderInputRef.current?.click();
      return;
    }

    try {
      const rootDirectory = await pickerApi();
      const files = await collectSpineCandidateFilesFromDirectory(rootDirectory);
      const discoveredAssets = await buildDiscoveredAssetsFromCandidateFiles(files);

      if (discoveredAssets.length === 0) {
        alert(NO_SPINE_FILES_FOUND_MESSAGE);
        return;
      }

      onSearchSpineFilesDiscovered(discoveredAssets);
    } catch {
      // User canceled folder selection.
    }
  };

  const handleBrowsePathClick = async () => {
    const pickerApi = (
      window as Window & {
        showDirectoryPicker?: () => Promise<PickerDirectoryHandleLike>;
      }
    ).showDirectoryPicker;

    if (!pickerApi) {
      alert('Directory picker is not supported in this browser. Paste the path manually.');
      return;
    }

    try {
      const directoryHandle = await pickerApi();
      if (directoryHandle?.name) {
        setPathInput(directoryHandle.name);
      }
    } catch {
      // User canceled selection.
    }
  };

  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await onImportJSON(file);
    if (result.success) {
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    } else {
      alert(result.error || 'Import failed');
    }
  };

  const handleFolderFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = collectSpineCandidateFilesFromFileList(fileList);
    const discoveredAssets = await buildDiscoveredAssetsFromCandidateFiles(files);

    if (discoveredAssets.length === 0) {
      alert(NO_SPINE_FILES_FOUND_MESSAGE);
      if (folderInputRef.current) folderInputRef.current.value = '';
      return;
    }

    onSearchSpineFilesDiscovered(discoveredAssets);
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleSavePath = async () => {
    const result = await onUpdateFinalAssetsPath(pathInput.trim() || null);
    if (!result.success) {
      alert(result.error || 'Failed to update Final Assets path');
      return;
    }
    setIsPathDialogOpen(false);
  };

  const handleDisconnectPath = async () => {
    const result = await onUpdateFinalAssetsPath(null);
    if (!result.success) {
      alert(result.error || 'Failed to remove Final Assets path');
      return;
    }
    setPathInput('');
    setIsPathDialogOpen(false);
  };

  const status = STATUS_DISPLAY[saveStatus];
  const isConnected = !!finalAssetsPath;
  const canSearchSpineFiles = looksLikeFinalAssetsPath(finalAssetsPath);

  return (
    <div className="shrink-0">
      {/* Stats bar */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-surface px-4 py-1">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-caption font-semibold text-text-primary whitespace-nowrap">
            Spine Tracker {projectName && `- ${projectName}`}
          </h2>
          <span className={`text-xs whitespace-nowrap ${status.className}`}>{status.label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-surface-hover px-2 py-0.5 text-text-secondary">
            {skeletonCount} skeletons
          </span>
          <span className="rounded-full bg-surface-hover px-2 py-0.5 text-text-secondary">
            {animationStats.total} anim total
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            {animationStats.byStatus.planned}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            {animationStats.byStatus.ready_to_be_implemented}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {animationStats.byStatus.implemented}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            {animationStats.byStatus.not_as_intended}
          </span>
        </div>
        <div />
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-end gap-1 border-b border-border bg-surface px-4 py-1 min-w-0">
        <span
          className={`text-xs ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}
          title={finalAssetsPath || 'No Final Assets path configured for this project'}
        >
          Final Assets: {isConnected ? 'Connected' : 'Not connected'}
        </span>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-caption"
          onClick={() => setIsPathDialogOpen(true)}
        >
          <Folder className="h-3 w-3" />
          {isConnected ? 'Edit Path' : 'Set Path'}
        </Button>

        {canSearchSpineFiles ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-caption"
            onClick={handleSearchClick}
            title="Select your FINAL_ASSETS folder to scan DESKTOP/SPINE_ASSETS JSON files"
          >
            <Search className="h-3 w-3" />
            Search for Spine files
          </Button>
        ) : null}

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

        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-caption"
          onClick={onExportMarkdown}
          title="Export as Markdown"
        >
          <Download className="h-3 w-3" /> MD
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-caption"
          onClick={onExportJSON}
          title="Export as JSON"
        >
          <FileJson className="h-3 w-3" /> JSON
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-caption"
          onClick={handleImportClick}
          title="Import JSON"
        >
          <Upload className="h-3 w-3" /> Import
        </Button>

        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleJsonFileChange}
        />

        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleFolderFilesChange}
          {...directoryInputProps}
        />

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

      <Dialog open={isPathDialogOpen} onOpenChange={setIsPathDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Final Assets Folder Path</DialogTitle>
            <DialogDescription>
              Save your local FINAL_ASSETS path for this specific project and user. This path is
              informational and used as your source reference before searching for Spine files in
              DESKTOP/SPINE_ASSETS.
            </DialogDescription>
          </DialogHeader>

          <Input
            value={pathInput}
            onChange={(event) => setPathInput(event.target.value)}
            placeholder="C:\\Projects\\Game\\FINAL_ASSETS"
          />

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-text-tertiary">
              Folder picker returns folder name only. Paste full path manually if needed.
            </p>
            <Button type="button" variant="outline" onClick={handleBrowsePathClick}>
              Select Folder
            </Button>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div>
              {finalAssetsPath ? (
                <Button
                  variant="outline"
                  onClick={handleDisconnectPath}
                  disabled={isUpdatingFinalAssetsPath}
                >
                  Disconnect Path
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsPathDialogOpen(false)}
                disabled={isUpdatingFinalAssetsPath}
              >
                Cancel
              </Button>
              <Button onClick={handleSavePath} disabled={isUpdatingFinalAssetsPath}>
                {isUpdatingFinalAssetsPath ? 'Saving...' : 'Save Path'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
