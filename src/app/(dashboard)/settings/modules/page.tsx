'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Pencil, Trash2, Upload, X, Plus, Link2 } from 'lucide-react';
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
import type {
  BoardModuleTemplate,
  EpicNamePreset,
  ModuleImageAsset,
  ModuleTaskTemplate,
} from '@/types';
import {
  createLinkedThreeTaskTemplates,
  createSingleModuleTaskTemplate,
  getDefaultModuleTaskTemplates,
  normalizeModuleTaskTemplates,
} from '@/lib/modules';
import { STORY_POINT_VALUES } from '@/lib/utils';

const MANUAL_EPIC = '__manual__';
type ImageTarget = 'userStory' | string;

interface ModuleFormState {
  id: string | null;
  name: string;
  description: string;
  symbol: string;
  epicName: string;
  userStoryDescription: string;
  userStoryFeatureImage: string;
  taskTemplates: ModuleTaskTemplate[];
}

function createDefaultForm(): ModuleFormState {
  return {
    id: null,
    name: '',
    description: '',
    symbol: '',
    epicName: '',
    userStoryDescription: '',
    userStoryFeatureImage: '',
    taskTemplates: getDefaultModuleTaskTemplates(),
  };
}

function normalizeTagInput(value: string): string {
  return value.trim();
}

function sortTasksForDisplay(tasks: ModuleTaskTemplate[]): ModuleTaskTemplate[] {
  return [...tasks].sort((a, b) => {
    if (a.chainGroupId && b.chainGroupId) {
      if (a.chainGroupId !== b.chainGroupId) return a.chainGroupId.localeCompare(b.chainGroupId);
      return (a.chainOrder ?? 0) - (b.chainOrder ?? 0);
    }
    if (a.chainGroupId) return -1;
    if (b.chainGroupId) return 1;
    return 0;
  });
}

export default function ModulesSettingsPage() {
  const [modules, setModules] = useState<BoardModuleTemplate[]>([]);
  const [epicNames, setEpicNames] = useState<EpicNamePreset[]>([]);
  const [moduleImages, setModuleImages] = useState<ModuleImageAsset[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [form, setForm] = useState<ModuleFormState>(createDefaultForm());
  const [epicSelection, setEpicSelection] = useState<string>(MANUAL_EPIC);
  const [uploadTarget, setUploadTarget] = useState<ImageTarget | null>(null);
  const [imageTags, setImageTags] = useState<string[]>(['module']);
  const [selectedPresetTag, setSelectedPresetTag] = useState('');
  const [manualTagInput, setManualTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [modulesRes, epicNamesRes, imagesRes, tagsRes] = await Promise.all([
        fetch('/api/settings/modules'),
        fetch('/api/settings/epic-names'),
        fetch('/api/settings/module-images'),
        fetch('/api/settings/tags'),
      ]);

      const [modulesData, epicNamesData, imagesData, tagsData] = await Promise.all([
        modulesRes.json(),
        epicNamesRes.json(),
        imagesRes.json(),
        tagsRes.json(),
      ]);

      if (modulesData.success) setModules(modulesData.data);
      if (epicNamesData.success) setEpicNames(epicNamesData.data);
      if (imagesData.success) setModuleImages(imagesData.data);
      if (tagsData.success) setAvailableTags(tagsData.data.map((tag: { name: string }) => tag.name));
    } catch (error) {
      console.error('Failed to load module settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const epicNamesByName = useMemo(() => new Set(epicNames.map((item) => item.name)), [epicNames]);

  useEffect(() => {
    if (!form.epicName) {
      setEpicSelection(MANUAL_EPIC);
      return;
    }

    if (epicNamesByName.has(form.epicName)) {
      setEpicSelection(form.epicName);
      return;
    }

    setEpicSelection(MANUAL_EPIC);
  }, [form.epicName, epicNamesByName]);

  const resetForm = () => {
    setForm(createDefaultForm());
    setEpicSelection(MANUAL_EPIC);
  };

  const handleEdit = (module: BoardModuleTemplate) => {
    setForm({
      id: module.id,
      name: module.name,
      description: module.description || '',
      symbol: module.symbol,
      epicName: module.epicName,
      userStoryDescription: module.userStoryDescription || '',
      userStoryFeatureImage: module.userStoryFeatureImage || '',
      taskTemplates: normalizeModuleTaskTemplates(module.taskTemplates),
    });
  };

  const updateTask = (taskId: string, updates: Partial<ModuleTaskTemplate>) => {
    setForm((prev) => ({
      ...prev,
      taskTemplates: prev.taskTemplates.map((item) => (item.id === taskId ? { ...item, ...updates } : item)),
    }));
  };

  const normalizeGroupOrders = (tasks: ModuleTaskTemplate[]): ModuleTaskTemplate[] => {
    const byGroup = new Map<string, ModuleTaskTemplate[]>();
    tasks.forEach((task) => {
      if (!task.chainGroupId) return;
      const group = byGroup.get(task.chainGroupId) || [];
      group.push(task);
      byGroup.set(task.chainGroupId, group);
    });

    return tasks.map((task) => {
      if (!task.chainGroupId) return task;
      const group = byGroup.get(task.chainGroupId) || [];
      const sorted = [...group].sort((a, b) => (a.chainOrder ?? 0) - (b.chainOrder ?? 0));
      const idx = sorted.findIndex((item) => item.id === task.id);
      return { ...task, chainOrder: idx >= 0 ? idx : 0 };
    });
  };

  const deleteTask = (taskId: string) => {
    setForm((prev) => {
      if (prev.taskTemplates.length <= 1) {
        alert('A module must include at least one task.');
        return prev;
      }

      const remaining = prev.taskTemplates.filter((task) => task.id !== taskId);
      return {
        ...prev,
        taskTemplates: normalizeGroupOrders(remaining),
      };
    });
  };

  const addSingleTask = () => {
    setForm((prev) => ({
      ...prev,
      taskTemplates: [...prev.taskTemplates, createSingleModuleTaskTemplate()],
    }));
  };

  const addLinkedTaskGroup = () => {
    setForm((prev) => ({
      ...prev,
      taskTemplates: [...prev.taskTemplates, ...createLinkedThreeTaskTemplates()],
    }));
  };

  const setImageForTarget = (target: ImageTarget, url: string | null) => {
    if (target === 'userStory') {
      setForm((prev) => ({ ...prev, userStoryFeatureImage: url || '' }));
      return;
    }

    updateTask(target, { featureImage: url });
  };

  const addTag = (tag: string) => {
    const normalized = normalizeTagInput(tag);
    if (!normalized) return;

    setImageTags((prev) => {
      if (prev.includes(normalized)) return prev;
      if (prev.length >= 3) return prev;
      return [...prev, normalized];
    });
  };

  const removeTag = (tag: string) => {
    if (tag === 'module') return;
    setImageTags((prev) => prev.filter((item) => item !== tag));
  };

  const startUploadForTarget = (target: ImageTarget) => {
    setUploadTarget(target);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleUploadSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadTarget) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        alert(uploadData.error?.message || 'Image upload failed');
        return;
      }

      const saveRes = await fetch('/api/settings/module-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadData.data.name,
          url: uploadData.data.url,
          tags: imageTags,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveData.success) {
        alert(saveData.error?.message || 'Failed to save image metadata');
        return;
      }

      setImageForTarget(uploadTarget, saveData.data.url);
      await loadData();
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      setUploadTarget(null);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.symbol.trim() || !form.epicName.trim()) {
      alert('Module name, user story name, and epic name are required.');
      return;
    }

    if (form.taskTemplates.length === 0) {
      alert('A module must include at least one task.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        symbol: form.symbol.trim().toUpperCase(),
        epicName: form.epicName.trim(),
        userStoryDescription: form.userStoryDescription.trim() || null,
        userStoryFeatureImage: form.userStoryFeatureImage.trim() || null,
        taskTemplates: sortTasksForDisplay(form.taskTemplates).map((task) => ({
          id: task.id,
          title: task.title,
          color: task.color,
          description: task.description || null,
          storyPoints: task.storyPoints,
          featureImage: task.featureImage || null,
          destinationMode: task.destinationMode,
          chainGroupId: task.chainGroupId,
          chainOrder: task.chainOrder,
        })),
      };

      const response = await fetch(form.id ? `/api/settings/modules/${form.id}` : '/api/settings/modules', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!result.success) {
        alert(result.error?.message || 'Failed to save module');
        return;
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Failed to save module:', error);
      alert('Failed to save module');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (moduleId: string) => {
    if (!confirm('Delete this module template?')) return;

    try {
      const response = await fetch(`/api/settings/modules/${moduleId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!result.success) {
        alert(result.error?.message || 'Failed to delete module');
        return;
      }
      await loadData();
      if (form.id === moduleId) resetForm();
    } catch (error) {
      console.error('Failed to delete module:', error);
      alert('Failed to delete module');
    }
  };

  const renderImageSelector = (target: ImageTarget, currentUrl: string | null) => {
    const selectedImage = moduleImages.find((item) => item.url === currentUrl);

    return (
      <div className="space-y-2 rounded-md border border-border-subtle bg-background p-2">
        <div className="flex items-center gap-2">
          <Select
            value={selectedImage?.id || 'none'}
            onValueChange={(value) => {
              if (value === 'none') {
                setImageForTarget(target, null);
                return;
              }
              const image = moduleImages.find((item) => item.id === value);
              setImageForTarget(target, image?.url || null);
            }}
          >
            <SelectTrigger className="flex-1 h-8">
              <SelectValue placeholder="Select existing image" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No image</SelectItem>
              {moduleImages.map((image) => (
                <SelectItem key={image.id} value={image.id}>
                  {image.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => startUploadForTarget(target)}
            disabled={isUploadingImage}
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            Upload
          </Button>
          {currentUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setImageForTarget(target, null)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {currentUrl && (
          <div className="relative h-20 w-full overflow-hidden rounded-md border border-border-subtle">
            <Image src={currentUrl} alt="Selected" fill className="object-cover" sizes="320px" />
          </div>
        )}
      </div>
    );
  };

  const groupedTaskData = useMemo(() => {
    const sorted = sortTasksForDisplay(form.taskTemplates);
    const groups = new Map<string, ModuleTaskTemplate[]>();
    const singles: ModuleTaskTemplate[] = [];

    sorted.forEach((task) => {
      if (task.chainGroupId) {
        const existing = groups.get(task.chainGroupId) || [];
        existing.push(task);
        groups.set(task.chainGroupId, existing);
      } else {
        singles.push(task);
      }
    });

    return {
      groups: Array.from(groups.entries()).map(([groupId, tasks], index) => ({
        groupId,
        label: `Linked Group ${index + 1}`,
        tasks: tasks.sort((a, b) => (a.chainOrder ?? 0) - (b.chainOrder ?? 0)),
      })),
      singles,
    };
  }, [form.taskTemplates]);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-text-secondary">Loading modules...</div>;
  }

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUploadSelected} />

      <div>
        <h2 className="text-title font-semibold">Modules</h2>
        <p className="mt-1 text-body text-text-secondary">
          Configure module templates with independent section cards and flexible task groups.
        </p>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface p-4 space-y-3">
        <h3 className="text-body font-semibold">Module Header</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Module name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            placeholder="User story name (e.g. M1)"
            value={form.symbol}
            onChange={(e) => setForm((prev) => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
          />
        </div>
        <Textarea
          placeholder="Module description (optional)"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3 items-start">
        <div className="rounded-lg border border-border-subtle bg-surface p-4 space-y-3 h-fit">
          <h3 className="text-body font-semibold">Epic Settings</h3>
          <Select
            value={epicSelection}
            onValueChange={(value) => {
              setEpicSelection(value);
              if (value !== MANUAL_EPIC) {
                setForm((prev) => ({ ...prev, epicName: value }));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select preset Epic name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MANUAL_EPIC}>Manual Epic name</SelectItem>
              {epicNames.map((epic) => (
                <SelectItem key={epic.id} value={epic.name}>
                  {epic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Epic name"
            value={form.epicName}
            onChange={(e) => setForm((prev) => ({ ...prev, epicName: e.target.value }))}
          />
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface p-4 space-y-3 h-fit">
          <h3 className="text-body font-semibold">User Story Settings</h3>
          <Textarea
            placeholder="User story description (optional)"
            value={form.userStoryDescription}
            onChange={(e) => setForm((prev) => ({ ...prev, userStoryDescription: e.target.value }))}
            rows={3}
          />
          <div>
            <div className="mb-2 text-caption text-text-secondary">User Story Image</div>
            {renderImageSelector('userStory', form.userStoryFeatureImage || null)}
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface p-4 space-y-3 h-fit">
          <div className="flex items-center justify-between">
            <h3 className="text-body font-semibold">Task Settings</h3>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={addSingleTask}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Task
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={addLinkedTaskGroup}>
                <Link2 className="mr-1 h-3.5 w-3.5" />
                Add 3 Linked
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-border-subtle bg-background p-2 space-y-2">
            <div className="text-caption text-text-secondary">Default tags for next uploaded image (max 3)</div>
            <div className="flex flex-wrap gap-1">
              {imageTags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded bg-surface-hover px-2 py-1 text-tiny">
                  {tag}
                  {tag !== 'module' && (
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={selectedPresetTag || 'none'} onValueChange={(value) => {
                if (value === 'none') return;
                addTag(value);
                setSelectedPresetTag('');
              }}>
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue placeholder="Add preset tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select tag</SelectItem>
                  {availableTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-8"
                placeholder="Manual tag"
                value={manualTagInput}
                onChange={(e) => setManualTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(manualTagInput);
                    setManualTagInput('');
                  }
                }}
              />
            </div>
          </div>

          {groupedTaskData.groups.map((group) => (
            <div key={group.groupId} className="rounded-md border border-border-subtle bg-background p-2 space-y-2">
              <div className="text-caption font-medium text-text-secondary">{group.label}</div>
              {group.tasks.map((task) => (
                <div key={task.id} className="rounded-md border p-3 space-y-2" style={{ borderColor: `${task.color}66`, backgroundColor: `${task.color}12` }}>
                  <div className="flex items-center gap-2">
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(task.id, { title: e.target.value })}
                      placeholder="Task title"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTask(task.id)}
                      disabled={form.taskTemplates.length <= 1}
                      title={form.taskTemplates.length <= 1 ? 'A module needs at least one task' : 'Delete task'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Select
                    value={task.storyPoints === null ? 'none' : String(task.storyPoints)}
                    onValueChange={(value) => updateTask(task.id, { storyPoints: value === 'none' ? null : Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Story points" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No story points</SelectItem>
                      {STORY_POINT_VALUES.map((sp) => (
                        <SelectItem key={sp} value={String(sp)}>{sp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderImageSelector(task.id, task.featureImage || null)}
                  <Textarea
                    placeholder="Task description (optional)"
                    value={task.description || ''}
                    onChange={(e) => updateTask(task.id, { description: e.target.value || null })}
                    rows={2}
                  />
                </div>
              ))}
            </div>
          ))}

          {groupedTaskData.singles.length > 0 && (
            <div className="rounded-md border border-border-subtle bg-background p-2 space-y-2">
              <div className="text-caption font-medium text-text-secondary">Single Tasks</div>
              {groupedTaskData.singles.map((task) => (
                <div key={task.id} className="rounded-md border p-3 space-y-2" style={{ borderColor: `${task.color}66`, backgroundColor: `${task.color}12` }}>
                  <div className="flex items-center gap-2">
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(task.id, { title: e.target.value })}
                      placeholder="Task title"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTask(task.id)}
                      disabled={form.taskTemplates.length <= 1}
                      title={form.taskTemplates.length <= 1 ? 'A module needs at least one task' : 'Delete task'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Select
                    value={task.storyPoints === null ? 'none' : String(task.storyPoints)}
                    onValueChange={(value) => updateTask(task.id, { storyPoints: value === 'none' ? null : Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Story points" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No story points</SelectItem>
                      {STORY_POINT_VALUES.map((sp) => (
                        <SelectItem key={sp} value={String(sp)}>{sp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderImageSelector(task.id, task.featureImage || null)}
                  <Textarea
                    placeholder="Task description (optional)"
                    value={task.description || ''}
                    onChange={(e) => updateTask(task.id, { description: e.target.value || null })}
                    rows={2}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        {form.id && (
          <Button variant="outline" onClick={resetForm} disabled={isSaving}>Cancel edit</Button>
        )}
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? 'Saving...' : form.id ? 'Update Module' : 'Create Module'}
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-surface">
          <h3 className="font-medium">Saved Modules</h3>
          <span className="text-caption text-text-tertiary">{modules.length}</span>
        </div>

        {modules.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">No modules created yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {modules.map((module) => (
              <div key={module.id} className="p-4 bg-surface flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-medium text-text-primary">{module.name} ({module.symbol})</div>
                  {module.description && <div className="text-caption text-text-secondary">{module.description}</div>}
                  <div className="text-caption text-text-secondary">Epic: {module.epicName}</div>
                  <div className="text-caption text-text-tertiary">Tasks: {module.taskTemplates.length}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(module)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(module.id)}>
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
