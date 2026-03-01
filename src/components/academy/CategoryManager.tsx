'use client';

import { useState } from 'react';
import { Plus, ArrowUp, ArrowDown, X } from 'lucide-react';
import type { AcademyCategory } from '@/types/academy';

interface CategoryManagerProps {
  categories: AcademyCategory[];
  mutations: {
    createCategory: (data: { name: string; color?: string }) => Promise<unknown>;
    updateCategory: (id: string, data: { name?: string; color?: string; isActive?: boolean }) => Promise<unknown>;
    deleteCategory: (id: string) => Promise<void>;
    reorderCategories: (ids: string[]) => Promise<void>;
  };
}

export function CategoryManager({ categories, mutations }: CategoryManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await mutations.createCategory({ name: newName.trim(), color: newColor });
    setNewName('');
    setShowAdd(false);
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const ids = categories.map((c) => c.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= ids.length) return;
    [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
    await mutations.reorderCategories(ids);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await mutations.updateCategory(id, { name: editName.trim() });
    setEditingId(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-primary">Categories</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {showAdd && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-7 w-7 cursor-pointer rounded border-0"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name..."
            className="flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            autoFocus
          />
          <button onClick={handleCreate} className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">
            Add
          </button>
        </div>
      )}

      <div className="space-y-1">
        {categories.map((cat, i) => (
          <div key={cat.id} className="flex items-center gap-1.5 rounded bg-surface px-2 py-1">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color || '#9ca3af' }} />
            {editingId === cat.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-foreground"
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(cat.id); if (e.key === 'Escape') setEditingId(null); }}
                autoFocus
              />
            ) : (
              <span
                className="flex-1 cursor-pointer text-xs"
                onDoubleClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
              >
                {cat.name}
              </span>
            )}
            <button
              onClick={() => handleReorder(i, 'up')}
              disabled={i === 0}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => handleReorder(i, 'down')}
              disabled={i === categories.length - 1}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => mutations.deleteCategory(cat.id)}
              className="text-muted-foreground hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
