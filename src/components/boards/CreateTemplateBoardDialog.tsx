'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import {
  BoardDialogActions,
  BoardDialogNameDescriptionFields,
  BoardDialogShell,
  finalizeBoardDialogForBoard,
  parseBoardDialogApiResponse,
} from './board-dialog-shared';

export function CreateTemplateBoardDialog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/boards?response=minimal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          template: 'BLANK',
          isTemplate: true,
        }),
      });

      const data = await parseBoardDialogApiResponse(response);

      if (!data.success || !data.data?.id) {
        setError(data.error?.message || 'Failed to create template');
        return;
      }

      await finalizeBoardDialogForBoard({
        boardId: data.data.id,
        onReset: () => {
          setOpen(false);
          setName('');
          setDescription('');
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
      triggerLabel="New Template"
      triggerVariant="outline"
      title="Create Template Board"
      description="Create a template board that can be used to quickly start new projects with predefined cards and structure."
      onSubmit={handleSubmit}
    >
      <BoardDialogNameDescriptionFields
        error={error}
        nameId="template-name"
        nameLabel="Template Name"
        name={name}
        onNameChange={setName}
        namePlaceholder="My Project Template"
        descriptionId="template-description"
        description={description}
        onDescriptionChange={setDescription}
        descriptionPlaceholder="Describe what this template is for..."
        descriptionRows={3}
        isLoading={isLoading}
      />
      <div className="rounded-lg border border-border bg-surface-hover/50 p-3 text-caption text-text-tertiary">
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong className="text-text-secondary">Template boards:</strong> They are not connected to projects, don&apos;t show in timeline, and don&apos;t track dates or assigned users. Use them as blueprints for quickly creating new boards.
          </div>
        </div>
      </div>
      <BoardDialogActions
        onCancel={() => setOpen(false)}
        isLoading={isLoading}
        isSubmitDisabled={isLoading || !name.trim()}
        submitLabel="Create Template"
        loadingLabel="Creating..."
      />
    </BoardDialogShell>
  );
}
