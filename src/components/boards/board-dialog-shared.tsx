'use client';

import type { FormEventHandler, ReactNode } from 'react';
import type { QueryClient } from '@tanstack/react-query';
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

export interface BoardDialogApiResponse {
  success?: boolean;
  data?: { id: string };
  error?: { message?: string };
}

export async function parseBoardDialogApiResponse(
  response: Response
): Promise<BoardDialogApiResponse> {
  const text = await response.text();
  try {
    return JSON.parse(text) as BoardDialogApiResponse;
  } catch {
    throw new Error(
      text.startsWith('<!DOCTYPE')
        ? 'Server returned HTML instead of JSON. Please refresh and try again.'
        : 'Invalid server response'
    );
  }
}

interface FinalizeBoardDialogCreationParams {
  boardId: string;
  onReset: () => void;
  invalidateBoards: () => Promise<unknown> | unknown;
  navigateToBoard: (boardId: string) => void;
}

export async function finalizeBoardDialogCreation({
  boardId,
  onReset,
  invalidateBoards,
  navigateToBoard,
}: FinalizeBoardDialogCreationParams) {
  onReset();
  await invalidateBoards();
  navigateToBoard(boardId);
}

interface FinalizeBoardDialogForBoardParams {
  boardId: string;
  onReset: () => void;
  queryClient: QueryClient;
  navigate: (path: string) => void;
}

export async function finalizeBoardDialogForBoard({
  boardId,
  onReset,
  queryClient,
  navigate,
}: FinalizeBoardDialogForBoardParams) {
  await finalizeBoardDialogCreation({
    boardId,
    onReset,
    invalidateBoards: () => queryClient.invalidateQueries({ queryKey: ['boards'] }),
    navigateToBoard: (id) => navigate(`/boards/${id}`),
  });
}

interface BoardDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel: string;
  triggerVariant?: 'default' | 'outline';
  title: string;
  description: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}

export function BoardDialogShell({
  open,
  onOpenChange,
  triggerLabel,
  triggerVariant = 'default',
  title,
  description,
  onSubmit,
  children,
}: BoardDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant}>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface BoardDialogNameDescriptionFieldsProps {
  error: string | null;
  nameId: string;
  nameLabel: string;
  name: string;
  onNameChange: (value: string) => void;
  namePlaceholder: string;
  descriptionId: string;
  description: string;
  onDescriptionChange: (value: string) => void;
  descriptionPlaceholder: string;
  descriptionRows: number;
  isLoading: boolean;
}

export function BoardDialogNameDescriptionFields({
  error,
  nameId,
  nameLabel,
  name,
  onNameChange,
  namePlaceholder,
  descriptionId,
  description,
  onDescriptionChange,
  descriptionPlaceholder,
  descriptionRows,
  isLoading,
}: BoardDialogNameDescriptionFieldsProps) {
  return (
    <>
      {error && (
        <div className="rounded-md bg-error/10 p-3 text-sm text-error">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor={nameId}>{nameLabel}</Label>
        <Input
          id={nameId}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={namePlaceholder}
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={descriptionId}>Description (optional)</Label>
        <Textarea
          id={descriptionId}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={descriptionPlaceholder}
          rows={descriptionRows}
          disabled={isLoading}
        />
      </div>
    </>
  );
}

interface BoardDialogActionsProps {
  onCancel: () => void;
  isLoading: boolean;
  isSubmitDisabled: boolean;
  submitLabel: string;
  loadingLabel: string;
}

export function BoardDialogActions({
  onCancel,
  isLoading,
  isSubmitDisabled,
  submitLabel,
  loadingLabel,
}: BoardDialogActionsProps) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
        disabled={isLoading}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitDisabled}>
        {isLoading ? loadingLabel : submitLabel}
      </Button>
    </div>
  );
}
