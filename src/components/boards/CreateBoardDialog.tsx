'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, Layers, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import type { CoreProjectTemplate } from '@/types';
import { cn } from '@/lib/utils';
import {
  BoardDialogActions,
  BoardDialogNameDescriptionFields,
  BoardDialogShell,
  finalizeBoardDialogForBoard,
  parseBoardDialogApiResponse,
} from './board-dialog-shared';
import { fetchProjectTemplates, type ProjectTemplateSummary } from '@/lib/project-templates';

export function CreateBoardDialog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coreTemplates, setCoreTemplates] = useState<CoreProjectTemplate[]>([]);
  const [selectedCoreTemplateId, setSelectedCoreTemplateId] = useState<string>('');
  const [useBlankTemplate, setUseBlankTemplate] = useState(false);
  const [selectedProjectTemplate, setSelectedProjectTemplate] = useState<string | null>(null);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isLoadingCoreTemplates, setIsLoadingCoreTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch project templates when dialog opens
  useEffect(() => {
    if (!open) return;

    setIsLoadingTemplates(true);
    fetchProjectTemplates()
      .then(setProjectTemplates)
      .catch(console.error)
      .finally(() => setIsLoadingTemplates(false));
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
          if (templates.length > 0) {
            setSelectedCoreTemplateId((prev) => prev || templates[0].id);
            setUseBlankTemplate((prev) => (prev ? false : prev));
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingCoreTemplates(false));
  }, [open]);

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
        response = await fetch('/api/boards?response=minimal', {
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

      const data = await parseBoardDialogApiResponse(response);

      if (!data.success || !data.data?.id) {
        setError(data.error?.message || 'Failed to create board');
        return;
      }

      await finalizeBoardDialogForBoard({
        boardId: data.data.id,
        onReset: () => {
          setOpen(false);
          setName('');
          setDescription('');
          setSelectedCoreTemplateId(coreTemplates[0]?.id || '');
          setUseBlankTemplate(false);
          setSelectedProjectTemplate(null);
        },
        queryClient,
        navigate: (path) => router.push(path),
      });
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BoardDialogShell
      open={open}
      onOpenChange={setOpen}
      triggerLabel="New Board"
      title="Create New Board"
      description="Create a new board to organize your project."
      onSubmit={handleSubmit}
    >
      <BoardDialogNameDescriptionFields
        error={error}
        nameId="board-name"
        nameLabel="Board Name"
        name={name}
        onNameChange={setName}
        namePlaceholder="My Project"
        descriptionId="board-description"
        description={description}
        onDescriptionChange={setDescription}
        descriptionPlaceholder="What is this board about?"
        descriptionRows={2}
        isLoading={isLoading}
      />
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
      <BoardDialogActions
        onCancel={() => setOpen(false)}
        isLoading={isLoading}
        isSubmitDisabled={isLoading || !name.trim()}
        submitLabel="Create Board"
        loadingLabel="Creating..."
      />
    </BoardDialogShell>
  );
}
