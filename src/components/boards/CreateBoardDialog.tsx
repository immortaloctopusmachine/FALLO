'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, Layers, FileText } from 'lucide-react';
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
import type { CoreProjectTemplate } from '@/types';
import { cn } from '@/lib/utils';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  listCount: number;
}

async function parseApiResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as { success?: boolean; data?: { id: string }; error?: { message?: string } };
  } catch {
    throw new Error(
      text.startsWith('<!DOCTYPE')
        ? 'Server returned HTML instead of JSON. Please refresh and try again.'
        : 'Invalid server response'
    );
  }
}

export function CreateBoardDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coreTemplates, setCoreTemplates] = useState<CoreProjectTemplate[]>([]);
  const [selectedCoreTemplateId, setSelectedCoreTemplateId] = useState<string>('');
  const [useBlankTemplate, setUseBlankTemplate] = useState(false);
  const [selectedProjectTemplate, setSelectedProjectTemplate] = useState<string | null>(null);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isLoadingCoreTemplates, setIsLoadingCoreTemplates] = useState(false);
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

  // Fetch core templates when dialog opens
  useEffect(() => {
    if (!open) return;
    setIsLoadingCoreTemplates(true);
    fetch('/api/settings/core-project-templates')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.templates) {
          const templates = data.data.templates as CoreProjectTemplate[];
          setCoreTemplates(templates);
          if (!selectedCoreTemplateId && templates.length > 0) {
            setSelectedCoreTemplateId(templates[0].id);
            setUseBlankTemplate(false);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingCoreTemplates(false));
  }, [open, selectedCoreTemplateId]);

  const handleSelectProjectTemplate = (templateId: string) => {
    setSelectedProjectTemplate(templateId);
    setUseBlankTemplate(false);
    setSelectedCoreTemplateId('');
  };

  const handleSelectCoreTemplate = (templateId: string) => {
    setSelectedProjectTemplate(null);
    setUseBlankTemplate(false);
    setSelectedCoreTemplateId(templateId);
  };

  const handleSelectBlankTemplate = () => {
    setSelectedProjectTemplate(null);
    setSelectedCoreTemplateId('');
    setUseBlankTemplate(true);
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
        // Create new board with core template (or blank)
        response = await fetch('/api/boards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            template: useBlankTemplate ? 'BLANK' : undefined,
            coreTemplateId: !useBlankTemplate ? selectedCoreTemplateId || undefined : undefined,
          }),
        });
      }

      const data = await parseApiResponse(response);

      if (!data.success || !data.data?.id) {
        setError(data.error?.message || 'Failed to create board');
        return;
      }

      setOpen(false);
      setName('');
      setDescription('');
      setSelectedCoreTemplateId(coreTemplates[0]?.id || '');
      setUseBlankTemplate(false);
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

          {/* Core Templates / Blank Section */}
          <div className="space-y-2">
            <Label>{projectTemplates.length > 0 ? 'Or Start Fresh' : 'Core Template'}</Label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={handleSelectBlankTemplate}
                disabled={isLoading}
                className={cn(
                  'flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors',
                  useBlankTemplate && !selectedProjectTemplate
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-border hover:border-border-hover hover:bg-surface-hover'
                )}
              >
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  useBlankTemplate && !selectedProjectTemplate ? 'bg-green-500 text-white' : 'bg-surface-hover text-text-secondary'
                )}>
                  <LayoutGrid className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'font-medium text-body',
                    useBlankTemplate && !selectedProjectTemplate ? 'text-green-600' : 'text-text-primary'
                  )}>
                    Blank Board
                  </div>
                  <div className="text-caption text-text-tertiary line-clamp-1">
                    Start with no pre-created planning blocks.
                  </div>
                </div>
              </button>

              {coreTemplates.map((templateData) => {
                const isSelected = selectedCoreTemplateId === templateData.id && !selectedProjectTemplate;
                return (
                  <button
                    key={templateData.id}
                    type="button"
                    onClick={() => handleSelectCoreTemplate(templateData.id)}
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
                      <Layers className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        'font-medium text-body',
                        isSelected ? 'text-green-600' : 'text-text-primary'
                      )}>
                        {templateData.name}
                      </div>
                      <div className="text-caption text-text-tertiary line-clamp-1">
                        {templateData.description || `${templateData.blocks.length} blocks, ${templateData.events.length} events`}
                      </div>
                    </div>
                  </button>
                );
              })}

              {isLoadingCoreTemplates && (
                <div className="text-caption text-text-tertiary px-1">Loading core templates...</div>
              )}
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
