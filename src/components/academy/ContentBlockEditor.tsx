'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Type, ImageIcon, Film, Volume2, Loader2 } from 'lucide-react';
import type { ContentBlock } from '@/types/academy';

interface ContentBlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export function ContentBlockEditor({ blocks, onChange }: ContentBlockEditorProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBlockType, setPendingBlockType] = useState<'IMAGE' | 'VIDEO' | 'AUDIO' | null>(null);

  const addBlock = (type: ContentBlock['type']) => {
    if (type === 'TEXT') {
      onChange([...blocks, { id: generateId(), type: 'TEXT', content: '' }]);
    } else {
      // Trigger file upload
      setPendingBlockType(type);
      fileInputRef.current?.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingBlockType) return;

    const blockId = generateId();
    setUploading(blockId);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json();

      if (!json.success) throw new Error(json.error?.message || 'Upload failed');

      const newBlock: ContentBlock = pendingBlockType === 'IMAGE'
        ? { id: blockId, type: 'IMAGE', url: json.data.url, alt: file.name, caption: '' }
        : pendingBlockType === 'VIDEO'
          ? { id: blockId, type: 'VIDEO', url: json.data.url, caption: '' }
          : { id: blockId, type: 'AUDIO', url: json.data.url, caption: '' };

      onChange([...blocks, newBlock]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(null);
      setPendingBlockType(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    onChange(blocks.map((b) => b.id === id ? { ...b, ...updates } as ContentBlock : b));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
    onChange(newBlocks);
  };

  const acceptTypes = pendingBlockType === 'IMAGE'
    ? 'image/*'
    : pendingBlockType === 'VIDEO'
      ? 'video/*'
      : 'audio/*';

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        className="hidden"
        onChange={handleFileUpload}
      />

      {blocks.map((block, index) => (
        <div key={block.id} className="group relative rounded border border-border bg-surface p-3">
          {/* Block controls */}
          <div className="absolute -right-1 -top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => moveBlock(index, 'up')}
              disabled={index === 0}
              className="rounded bg-surface-hover p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => moveBlock(index, 'down')}
              disabled={index === blocks.length - 1}
              className="rounded bg-surface-hover p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => removeBlock(block.id)}
              className="rounded bg-surface-hover p-1 text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          {/* Block content */}
          {block.type === 'TEXT' && (
            <textarea
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              placeholder="Write markdown text..."
              className="min-h-[100px] w-full resize-y rounded border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              rows={4}
            />
          )}

          {block.type === 'IMAGE' && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> Image
              </div>
              {block.url && (
                <img src={block.url} alt={block.alt} className="max-h-48 rounded object-contain" />
              )}
              <input
                type="text"
                value={block.alt}
                onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
                placeholder="Alt text..."
                className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
              />
              <input
                type="text"
                value={block.caption || ''}
                onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                placeholder="Caption (optional)..."
                className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
              />
            </div>
          )}

          {block.type === 'VIDEO' && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Film className="h-3 w-3" /> Video
              </div>
              {block.url && (
                <video src={block.url} controls className="max-h-48 rounded" />
              )}
              <input
                type="text"
                value={block.caption || ''}
                onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                placeholder="Caption (optional)..."
                className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
              />
            </div>
          )}

          {block.type === 'AUDIO' && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Volume2 className="h-3 w-3" /> Audio
              </div>
              {block.url && (
                <audio src={block.url} controls className="w-full" />
              )}
              <input
                type="text"
                value={block.caption || ''}
                onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                placeholder="Caption (optional)..."
                className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
              />
            </div>
          )}
        </div>
      ))}

      {uploading && (
        <div className="flex items-center gap-2 rounded border border-dashed p-3 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading...
        </div>
      )}

      {/* Add block buttons */}
      <div className="flex gap-2">
        <button onClick={() => addBlock('TEXT')} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-surface-hover hover:text-foreground">
          <Type className="h-3 w-3" /> Text
        </button>
        <button onClick={() => addBlock('IMAGE')} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-surface-hover hover:text-foreground">
          <ImageIcon className="h-3 w-3" /> Image
        </button>
        <button onClick={() => addBlock('VIDEO')} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-surface-hover hover:text-foreground">
          <Film className="h-3 w-3" /> Video
        </button>
        <button onClick={() => addBlock('AUDIO')} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-surface-hover hover:text-foreground">
          <Volume2 className="h-3 w-3" /> Audio
        </button>
      </div>
    </div>
  );
}
