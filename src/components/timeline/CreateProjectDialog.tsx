'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Layers, Zap, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BOARD_TEMPLATES, snapToMonday } from '@/lib/list-templates';
import type { BoardTemplateType } from '@/types';
import { cn } from '@/lib/utils';

// Format date as YYYY-MM-DD for input
function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Check if a date is Monday
function isMonday(date: Date): boolean {
  return date.getDay() === 1;
}

interface Team {
  id: string;
  name: string;
  color: string;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  listCount: number;
}

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStartDate?: Date;
  teams: Team[];
}

const TEMPLATE_ICONS = {
  BLANK: Layers,
  STANDARD_SLOT: Layers,
  BRANDED_GAME: Zap,
} as const;

export function CreateProjectDialog({
  isOpen,
  onClose,
  defaultStartDate,
  teams,
}: CreateProjectDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [template, setTemplate] = useState<BoardTemplateType>('STANDARD_SLOT');
  const [selectedProjectTemplate, setSelectedProjectTemplate] = useState<string | null>(null);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default start date when provided (snap to Monday)
  useEffect(() => {
    if (defaultStartDate) {
      const monday = snapToMonday(defaultStartDate);
      setStartDate(formatDateInput(monday));
    }
  }, [defaultStartDate]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      if (defaultStartDate) {
        const monday = snapToMonday(defaultStartDate);
        setStartDate(formatDateInput(monday));
      } else {
        setStartDate('');
      }
      setSelectedTeamId('');
      setTemplate('STANDARD_SLOT');
      setSelectedProjectTemplate(null);
      setError(null);
    }
  }, [isOpen, defaultStartDate]);

  // Fetch project templates when dialog opens
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  const handleSelectProjectTemplate = (templateId: string) => {
    setSelectedProjectTemplate(templateId);
    setTemplate('BLANK');
  };

  const handleSelectListTemplate = (templateId: BoardTemplateType) => {
    setTemplate(templateId);
    setSelectedProjectTemplate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    if (!startDate) {
      setError('Start date is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let response;

      if (selectedProjectTemplate) {
        // Clone from project template
        response = await fetch(`/api/boards/${selectedProjectTemplate}/clone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            asTemplate: false,
            startDate: startDate || undefined,
            teamId: selectedTeamId || undefined,
          }),
        });
      } else {
        // Create new board with list template
        response = await fetch('/api/boards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            template,
            startDate: startDate || undefined,
            teamId: selectedTeamId || undefined,
          }),
        });
      }

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to create project');
        return;
      }

      onClose();
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project on the timeline. The project will have planning lists with dates based on your template selection.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name..."
              autoFocus
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">
              Start Date (Monday) <span className="text-error">*</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value);
                  // Always snap to Monday
                  const monday = snapToMonday(selectedDate);
                  setStartDate(formatDateInput(monday));
                }}
                className={cn("pl-10", !startDate && "border-warning")}
                required
              />
            </div>
            {startDate && !isMonday(new Date(startDate + 'T00:00:00')) && (
              <p className="text-caption text-warning">
                Date will be adjusted to the nearest Monday.
              </p>
            )}
            <p className="text-caption text-text-tertiary">
              Projects start on Mondays to align with weekly planning blocks. Planning lists will be calculated as 5-day work weeks (Mon-Fri).
            </p>
          </div>

          {/* Team Selection */}
          <div className="space-y-2">
            <Label htmlFor="team">Team (optional)</Label>
            <select
              id="team"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-body shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">No team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Template</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(BOARD_TEMPLATES) as BoardTemplateType[])
                .filter(key => key !== 'BLANK')
                .map((key) => {
                  const tmpl = BOARD_TEMPLATES[key];
                  const Icon = TEMPLATE_ICONS[key] || Layers;
                  const isSelected = template === key && !selectedProjectTemplate;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectListTemplate(key)}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors',
                        isSelected
                          ? 'border-success bg-success/10'
                          : 'border-border hover:border-success/50 hover:bg-surface-hover'
                      )}
                    >
                      <Icon className={cn(
                        'h-5 w-5 mt-0.5 shrink-0',
                        isSelected ? 'text-success' : 'text-text-tertiary'
                      )} />
                      <div>
                        <div className={cn(
                          'font-medium text-body',
                          isSelected ? 'text-success' : 'text-text-primary'
                        )}>
                          {tmpl.name}
                        </div>
                        <div className="text-caption text-text-tertiary mt-0.5">
                          {tmpl.planningLists.length} planning phases
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Project Templates */}
            {projectTemplates.length > 0 && (
              <div className="mt-3">
                <div className="text-caption text-text-secondary mb-2">From Project Template</div>
                <div className="grid grid-cols-2 gap-2">
                  {projectTemplates.map((pt) => {
                    const isSelected = selectedProjectTemplate === pt.id;
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => handleSelectProjectTemplate(pt.id)}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors',
                          isSelected
                            ? 'border-success bg-success/10'
                            : 'border-border hover:border-success/50 hover:bg-surface-hover'
                        )}
                      >
                        <FileText className={cn(
                          'h-5 w-5 mt-0.5 shrink-0',
                          isSelected ? 'text-success' : 'text-text-tertiary'
                        )} />
                        <div>
                          <div className={cn(
                            'font-medium text-body truncate',
                            isSelected ? 'text-success' : 'text-text-primary'
                          )}>
                            {pt.name}
                          </div>
                          <div className="text-caption text-text-tertiary mt-0.5">
                            {pt.listCount} lists
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {isLoadingTemplates && (
              <div className="text-caption text-text-tertiary">Loading templates...</div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-caption text-error">{error}</div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || !startDate}>
              {isLoading ? (
                'Creating...'
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
