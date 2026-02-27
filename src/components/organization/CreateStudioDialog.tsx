'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { OrganizationFormFields } from './OrganizationFormFields';

const STUDIO_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6',
];

export function CreateStudioDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(STUDIO_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/studios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, color }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to create studio');
        return;
      }

      setOpen(false);
      setName('');
      setDescription('');
      setColor(STUDIO_COLORS[0]);
      queryClient.invalidateQueries({ queryKey: ['studios'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
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
          New Studio
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Studio</DialogTitle>
          <DialogDescription>
            Studios group teams together and provide shared settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </div>
          )}
          <OrganizationFormFields
            nameId="studio-name"
            nameLabel="Name"
            namePlaceholder="e.g., Game Studio Alpha"
            name={name}
            onNameChange={setName}
            descriptionId="studio-description"
            descriptionLabel="Description"
            descriptionPlaceholder="What does this studio do?"
            description={description}
            onDescriptionChange={setDescription}
            colorLabel="Brand Color"
            colors={STUDIO_COLORS}
            selectedColor={color}
            onColorChange={setColor}
            disabled={isLoading}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Creating...' : 'Create Studio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
