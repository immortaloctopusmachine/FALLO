'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface SettingsEntity {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  position: number;
  _count?: { [key: string]: number };
  isDefault?: boolean;
}

interface SettingsEntityManagerProps {
  title: string;
  description: string;
  entities: SettingsEntity[];
  countLabel?: string;
  countField?: string;
  onAdd: (data: { name: string; description?: string; color?: string }) => Promise<void>;
  onUpdate: (id: string, data: { name?: string; description?: string; color?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
  showColor?: boolean;
}

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#71717a',
];

export function SettingsEntityManager({
  title,
  description,
  entities,
  countLabel = 'users',
  countField = 'userSkills',
  onAdd,
  onUpdate,
  onDelete,
  isLoading = false,
  showColor = true,
}: SettingsEntityManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = (entity: SettingsEntity) => {
    setEditingId(entity.id);
    setEditName(entity.name);
    setEditDescription(entity.description || '');
    setEditColor(entity.color || DEFAULT_COLORS[0]);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditColor('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate(editingId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        color: editColor || undefined,
      });
      handleCancelEdit();
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      await onAdd({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        color: newColor || undefined,
      });
      setIsAdding(false);
      setNewName('');
      setNewDescription('');
      setNewColor(DEFAULT_COLORS[0]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) return;
    setIsSaving(true);
    try {
      await onDelete(id);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-title font-semibold">{title}</h2>
          <p className="text-body text-text-secondary mt-1">{description}</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} disabled={isLoading || isSaving}>
            <Plus className="h-4 w-4 mr-2" />
            Add {title.slice(0, -1)}
          </Button>
        )}
      </div>

      {/* Add New Form */}
      {isAdding && (
        <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <div className="flex items-center gap-3">
            {showColor && (
              <div className="flex gap-1 flex-wrap">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 transition-transform',
                      newColor === color ? 'border-white scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>
          <Input
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <Input
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsAdding(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!newName.trim() || isSaving}>
              {isSaving ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {/* Entity List */}
      <div className="rounded-lg border border-border overflow-hidden">
        {entities.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            No {title.toLowerCase()} found. Add one to get started.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entities.map((entity) => (
              <div
                key={entity.id}
                className={cn(
                  'flex items-center gap-3 p-3 bg-surface hover:bg-surface-hover transition-colors',
                  editingId === entity.id && 'bg-surface-hover'
                )}
              >
                <GripVertical className="h-4 w-4 text-text-tertiary cursor-grab" />

                {showColor && (
                  editingId === entity.id ? (
                    <div className="flex gap-1 flex-wrap max-w-[200px]">
                      {DEFAULT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditColor(color)}
                          className={cn(
                            'w-5 h-5 rounded-full border-2 transition-transform',
                            editColor === color ? 'border-white scale-110' : 'border-transparent'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full shrink-0"
                      style={{ backgroundColor: entity.color || '#71717a' }}
                    />
                  )
                )}

                {editingId === entity.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8"
                    />
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description"
                      className="h-8"
                    />
                    <Button size="sm" variant="ghost" onClick={handleSaveEdit} disabled={isSaving}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={isSaving}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary">{entity.name}</div>
                      {entity.description && (
                        <div className="text-caption text-text-secondary truncate">
                          {entity.description}
                        </div>
                      )}
                    </div>

                    {entity._count && countField && (
                      <div className="text-caption text-text-tertiary">
                        {entity._count[countField] || 0} {countLabel}
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(entity)}
                        disabled={isLoading || isSaving}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(entity.id)}
                        disabled={isLoading || isSaving || entity.isDefault}
                        className={cn(entity.isDefault && 'opacity-50 cursor-not-allowed')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
