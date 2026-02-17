'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bone, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { SkeletonStatus, SpineSkeletonModule } from '@/types/spine-tracker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const GROUP_OPTIONS = [
  'symbols',
  'ui',
  'characters',
  'effects',
  'screens',
  'layout',
  'other',
] as const;

const STATUS_OPTIONS: SkeletonStatus[] = [
  'planned',
  'implemented',
  'ready_to_be_implemented',
  'not_as_intended',
];

type ModuleFormState = {
  id: string | null;
  skeletonName: string;
  group: string;
  status: SkeletonStatus;
  zOrder: string;
  description: string;
  placementParent: string;
  placementBone: string;
  placementNotes: string;
  generalNotes: string;
  animationNames: string;
  skinNames: string;
  eventNames: string;
};

function createEmptyForm(): ModuleFormState {
  return {
    id: null,
    skeletonName: '',
    group: 'other',
    status: 'planned',
    zOrder: '100',
    description: '',
    placementParent: 'LAYOUT_TEMPLATE',
    placementBone: '',
    placementNotes: '',
    generalNotes: '',
    animationNames: 'idle',
    skinNames: '',
    eventNames: '',
  };
}

function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toForm(module: SpineSkeletonModule): ModuleFormState {
  return {
    id: module.id,
    skeletonName: module.skeletonName,
    group: module.group || 'other',
    status: module.status,
    zOrder: String(module.zOrder ?? 100),
    description: module.description || '',
    placementParent: module.placementParent || '',
    placementBone: module.placementBone || '',
    placementNotes: module.placementNotes || '',
    generalNotes: module.generalNotes || '',
    animationNames: module.animations.map((animation) => animation.name).join('\n'),
    skinNames: module.skins.map((skin) => skin.name).join('\n'),
    eventNames: module.events.map((eventItem) => eventItem.name).join('\n'),
  };
}

function formToPayload(form: ModuleFormState) {
  const animationNames = parseLines(form.animationNames);
  const skinNames = parseLines(form.skinNames);
  const eventNames = parseLines(form.eventNames);
  const parsedZOrder = Number.parseInt(form.zOrder, 10);

  return {
    skeletonName: form.skeletonName.trim().toUpperCase(),
    group: form.group,
    status: form.status,
    zOrder: Number.isFinite(parsedZOrder) ? parsedZOrder : 100,
    description: form.description.trim() || null,
    placementParent: form.placementParent.trim() || null,
    placementBone: form.placementBone.trim() || null,
    placementNotes: form.placementNotes.trim() || null,
    generalNotes: form.generalNotes.trim() || null,
    animations: animationNames.map((name) => ({
      name,
      status: 'planned',
      track: 0,
      notes: '',
      soundFx: [],
    })),
    skins: skinNames.map((name) => ({
      name,
      status: 'planned',
      notes: '',
    })),
    events: eventNames.map((name) => ({
      name,
      animation: '',
      notes: '',
    })),
  };
}

export function SpineModulesSettingsClient() {
  const [modules, setModules] = useState<SpineSkeletonModule[]>([]);
  const [form, setForm] = useState<ModuleFormState>(createEmptyForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadModules = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/spine-modules');
      const payload = await response.json();
      if (!payload.success) {
        alert(payload.error?.message || 'Failed to load Spine modules');
        return;
      }
      setModules(payload.data as SpineSkeletonModule[]);
    } catch (error) {
      console.error('Failed to load Spine modules:', error);
      alert('Failed to load Spine modules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const resetForm = () => {
    setForm(createEmptyForm());
  };

  const handleSave = async () => {
    if (!form.skeletonName.trim()) {
      alert('Skeleton name is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        form.id ? `/api/settings/spine-modules/${form.id}` : '/api/settings/spine-modules',
        {
          method: form.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formToPayload(form)),
        }
      );

      const payload = await response.json();
      if (!payload.success) {
        alert(payload.error?.message || 'Failed to save Spine module');
        return;
      }

      await loadModules();
      resetForm();
    } catch (error) {
      console.error('Failed to save Spine module:', error);
      alert('Failed to save Spine module');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (moduleId: string) => {
    if (!confirm('Delete this Spine module?')) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/settings/spine-modules/${moduleId}`, {
        method: 'DELETE',
      });
      const payload = await response.json();
      if (!payload.success) {
        alert(payload.error?.message || 'Failed to delete Spine module');
        return;
      }

      setModules((prev) => prev.filter((module) => module.id !== moduleId));
      if (form.id === moduleId) resetForm();
    } catch (error) {
      console.error('Failed to delete Spine module:', error);
      alert('Failed to delete Spine module');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-title font-semibold">Spine Modules</h2>
        <p className="mt-1 text-body text-text-secondary">
          Define defaults per skeleton name. Search-import in boards uses these values when creating new entries.
        </p>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input
            value={form.skeletonName}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, skeletonName: event.target.value.toUpperCase() }))
            }
            placeholder="Skeleton name (required)"
          />

          <Select value={form.group} onValueChange={(value) => setForm((prev) => ({ ...prev, group: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              {GROUP_OPTIONS.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={form.status}
            onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as SkeletonStatus }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={form.zOrder}
            onChange={(event) => setForm((prev) => ({ ...prev, zOrder: event.target.value }))}
            placeholder="Z-order"
            type="number"
            min={0}
            max={999}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            value={form.placementParent}
            onChange={(event) => setForm((prev) => ({ ...prev, placementParent: event.target.value }))}
            placeholder="Placement skeleton (optional)"
          />
          <Input
            value={form.placementBone}
            onChange={(event) => setForm((prev) => ({ ...prev, placementBone: event.target.value }))}
            placeholder="Placement bone (optional)"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Description"
            rows={2}
          />
          <Textarea
            value={form.generalNotes}
            onChange={(event) => setForm((prev) => ({ ...prev, generalNotes: event.target.value }))}
            placeholder="General notes"
            rows={2}
          />
        </div>

        <Textarea
          value={form.placementNotes}
          onChange={(event) => setForm((prev) => ({ ...prev, placementNotes: event.target.value }))}
          placeholder="Placement notes"
          rows={2}
        />

        <div className="grid gap-3 md:grid-cols-3">
          <Textarea
            value={form.animationNames}
            onChange={(event) => setForm((prev) => ({ ...prev, animationNames: event.target.value }))}
            placeholder="Default animation names, one per line"
            rows={4}
          />
          <Textarea
            value={form.skinNames}
            onChange={(event) => setForm((prev) => ({ ...prev, skinNames: event.target.value }))}
            placeholder="Default skin names, one per line"
            rows={4}
          />
          <Textarea
            value={form.eventNames}
            onChange={(event) => setForm((prev) => ({ ...prev, eventNames: event.target.value }))}
            placeholder="Default event names, one per line"
            rows={4}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          {form.id ? (
            <Button variant="outline" onClick={resetForm} disabled={isSaving}>
              <X className="mr-1 h-4 w-4" />
              Cancel Edit
            </Button>
          ) : null}
          <Button onClick={handleSave} disabled={isSaving}>
            {form.id ? (
              <>
                <Pencil className="mr-1 h-4 w-4" />
                Update Module
              </>
            ) : (
              <>
                <Plus className="mr-1 h-4 w-4" />
                Create Module
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <h3 className="font-medium">Saved Spine Modules</h3>
          <span className="text-caption text-text-secondary">{modules.length}</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-text-secondary">Loading modules...</div>
        ) : modules.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">No Spine modules configured yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {modules.map((module) => (
              <div key={module.id} className="flex items-start justify-between gap-4 bg-surface p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bone className="h-4 w-4 text-text-tertiary" />
                    <span className="font-medium text-text-primary">{module.skeletonName}</span>
                  </div>
                  <div className="text-caption text-text-secondary">
                    Group: {module.group} - Status: {module.status} - Z: {module.zOrder}
                  </div>
                  {module.description ? (
                    <div className="text-caption text-text-secondary">{module.description}</div>
                  ) : null}
                  <div className="text-caption text-text-tertiary">
                    {module.animations.length} anim - {module.skins.length} skins - {module.events.length} events
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setForm(toForm(module))}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(module.id)} disabled={isSaving}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
