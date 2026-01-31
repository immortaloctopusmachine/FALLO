'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, Layers, Zap, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BOARD_TEMPLATES } from '@/lib/list-templates';
import type { BoardTemplateType } from '@/types';
import { cn } from '@/lib/utils';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  listCount: number;
}

const TEMPLATE_ICONS = {
  BLANK: LayoutGrid,
  STANDARD_SLOT: Layers,
  BRANDED_GAME: Zap,
} as const;

export function CreateBoardDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState<BoardTemplateType>('BLANK');
  const [selectedProjectTemplate, setSelectedProjectTemplate] = useState<string | null>(null);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch project templates when dialog opens
  useEffect(() => {
    if (open) {
      setIsLoadingTemplates(true);
      fetch('/api/boards?templates=true')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            const templates = data.data
              .filter((b: { isTemplate?: boolean }) => b.isTemplate)
              .map((b: { id: string; name: string; description: string | null; lists: unknown[] }) => ({
                id: b.id,
                name: b.name,
                description: b.description,
                listCount: b.lists?.length || 0,
              }));
            setProjectTemplates(templates);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingTemplates(false));
    }
  }, [open]);

  const handleSelectProjectTemplate = (templateId: string) => {
    setSelectedProjectTemplate(templateId);
    setTemplate('BLANK'); // Clear list template selection
  };

  const handleSelectListTemplate = (templateId: BoardTemplateType) => {
    setTemplate(templateId);
    setSelectedProjectTemplate(null); // Clear project template selection
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let response;

      if (selectedProjectTemplate) {
        // Clone from project template
        response = await fetch(`/api/boards/${selectedProjectTemplate}/clone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, asTemplate: false }),
        });
      } else {
        // Create new board with list template
        response = await fetch('/api/boards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, template }),
        });
      }

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to create board');
        return;
      }

      setOpen(false);
      setName('');
      setDescription('');
      setTemplate('BLANK');
      setSelectedProjectTemplate(null);
      router.push(`/boards/${data.data.id}`);
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Board
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
          <DialogDescription>
            Create a new board to organize your project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-error/10 p-3 text-sm text-error">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="board-name">Board Name</Label>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-description">Description (optional)</Label>
            <Textarea
              id="board-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this board about?"
              rows={2}
              disabled={isLoading}
            />
          </div>
          {/* Project Templates Section */}
          {projectTemplates.length > 0 && (
            <div className="space-y-2">
              <Label>From Project Template</Label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                {projectTemplates.map((tmpl) => {
                  const isSelected = selectedProjectTemplate === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleSelectProjectTemplate(tmpl.id)}
                      disabled={isLoading || isLoadingTemplates}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors',
                        isSelected
                          ? 'border-warning bg-warning/10'
                          : 'border-border hover:border-border-hover hover:bg-surface-hover'
                      )}
                    >
                      <div className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                        isSelected ? 'bg-warning text-white' : 'bg-surface-hover text-text-secondary'
                      )}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'font-medium text-body',
                          isSelected ? 'text-warning' : 'text-text-primary'
                        )}>
                          {tmpl.name}
                        </div>
                        <div className="text-caption text-text-tertiary line-clamp-1">
                          {tmpl.description || `${tmpl.listCount} lists with all cards`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* List Templates Section */}
          <div className="space-y-2">
            <Label>{projectTemplates.length > 0 ? 'Or Start Fresh' : 'Template'}</Label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(BOARD_TEMPLATES) as BoardTemplateType[]).map((templateId) => {
                const templateData = BOARD_TEMPLATES[templateId];
                const Icon = TEMPLATE_ICONS[templateId];
                const isSelected = template === templateId && !selectedProjectTemplate;
                return (
                  <button
                    key={templateId}
                    type="button"
                    onClick={() => handleSelectListTemplate(templateId)}
                    disabled={isLoading}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors',
                      isSelected
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-border hover:border-border-hover hover:bg-surface-hover'
                    )}
                  >
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                      isSelected ? 'bg-green-500 text-white' : 'bg-surface-hover text-text-secondary'
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        'font-medium text-body',
                        isSelected ? 'text-green-600' : 'text-text-primary'
                      )}>
                        {templateData.name}
                      </div>
                      <div className="text-caption text-text-tertiary line-clamp-1">
                        {templateData.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Creating...' : 'Create Board'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
