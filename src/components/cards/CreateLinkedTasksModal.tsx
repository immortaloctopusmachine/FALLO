'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiFetch } from '@/lib/api-client';
import { LINKED_TASK_PRESETS } from '@/lib/task-presets';
import { STORY_POINT_VALUES } from '@/lib/utils';
import type { Card, BoardMember, List, TaskReleaseMode } from '@/types';

interface CreateLinkedTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  userStoryId: string;
  userStoryListId: string;
  taskLists: List[];
  planningLists: List[];
  boardMembers: BoardMember[];
  onTasksCreated: (tasks: Card[]) => void;
}

interface TaskFormState {
  titleOverride: string | null; // null = auto-generated from baseName
  assigneeId: string | null;
  storyPoints: number | null;
  description: string;
  descriptionExpanded: boolean;
  listId: string;
  stagingPlanningListId: string;
  releaseTargetListId: string;
  destinationMode: TaskReleaseMode;
}

function createInitialStates(defaultTaskListId: string, defaultPlanningListId: string): TaskFormState[] {
  return LINKED_TASK_PRESETS.map(() => ({
    titleOverride: null,
    assigneeId: null,
    storyPoints: null,
    description: '',
    descriptionExpanded: false,
    listId: defaultTaskListId,
    stagingPlanningListId: defaultPlanningListId,
    releaseTargetListId: defaultTaskListId,
    destinationMode: 'IMMEDIATE' as TaskReleaseMode,
  }));
}

function getEffectiveTitle(task: TaskFormState, index: number, baseName: string): string {
  if (task.titleOverride !== null) return task.titleOverride;
  return baseName ? `${baseName} - ${LINKED_TASK_PRESETS[index].suffix}` : '';
}

export function CreateLinkedTasksModal({
  isOpen,
  onClose,
  boardId,
  userStoryId,
  userStoryListId,
  taskLists,
  planningLists,
  boardMembers,
  onTasksCreated,
}: CreateLinkedTasksModalProps) {
  const defaultTaskListId = taskLists[0]?.id || '';
  const defaultPlanningListId = userStoryListId || planningLists[0]?.id || '';
  const [baseName, setBaseName] = useState('');
  const [tasks, setTasks] = useState<TaskFormState[]>(
    createInitialStates(defaultTaskListId, defaultPlanningListId)
  );
  const [isCreating, setIsCreating] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setBaseName('');
      setTasks(createInitialStates(defaultTaskListId, defaultPlanningListId));
    }
  }, [isOpen, defaultTaskListId, defaultPlanningListId]);

  const updateTask = useCallback(
    (index: number, updates: Partial<TaskFormState>) => {
      setTasks((prev) =>
        prev.map((task, i) => (i === index ? { ...task, ...updates } : task))
      );
    },
    []
  );

  const handleTitleChange = useCallback(
    (index: number, value: string) => {
      updateTask(index, { titleOverride: value });
    },
    [updateTask]
  );

  const handleCreate = async () => {
    // Validate all titles
    const effectiveTitles = tasks.map((t, i) => getEffectiveTitle(t, i, baseName));
    const emptyIndex = effectiveTitles.findIndex((t) => !t.trim());
    if (emptyIndex !== -1) {
      toast.error(`Task ${emptyIndex + 1} needs a title`);
      return;
    }

    setIsCreating(true);
    const createdCards: Card[] = [];

    try {
      let previousTaskId: string | null = null;

      for (let i = 0; i < LINKED_TASK_PRESETS.length; i++) {
        const preset = LINKED_TASK_PRESETS[i];
        const task = tasks[i];

        const isStaged = task.destinationMode === 'STAGED';
        const listId = isStaged ? task.stagingPlanningListId : task.listId;

        const body: Record<string, unknown> = {
          title: effectiveTitles[i].trim(),
          type: 'TASK',
          listId,
          description: task.description.trim() || null,
          color: preset.color,
          assigneeIds: task.assigneeId ? [task.assigneeId] : [],
          taskData: {
            linkedUserStoryId: userStoryId,
            storyPoints: task.storyPoints,
            dependsOnTaskId: previousTaskId,
          },
          taskDestination: {
            mode: task.destinationMode,
            immediateListId: task.listId,
            stagingPlanningListId: task.stagingPlanningListId,
            releaseTargetListId: task.releaseTargetListId,
          },
        };

        const card = await apiFetch<Card>(
          `/api/boards/${boardId}/cards`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
        createdCards.push(card);
        previousTaskId = card.id;
      }

      onTasksCreated(createdCards);
      toast.success('3 linked tasks created');
      onClose();
    } catch (error) {
      console.error('Failed to create linked tasks:', error);
      toast.error('Failed to create some tasks');
      // Still notify about any that were created
      if (createdCards.length > 0) {
        onTasksCreated(createdCards);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Linked Tasks</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Base name input */}
          <div>
            <label className="text-caption font-medium text-text-secondary">
              Base Name
            </label>
            <Input
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="e.g. Walk Cycle"
              autoFocus
              className="mt-1"
            />
            <p className="mt-1 text-tiny text-text-tertiary">
              Auto-generates: &quot;{baseName || '...'} - CONCEPT&quot;, &quot;{baseName || '...'} - STATIC ART&quot;, &quot;{baseName || '...'} - FX/ANIMATION&quot;
            </p>
          </div>

          {/* Task rows */}
          <div className="space-y-3">
            {LINKED_TASK_PRESETS.map((preset, index) => {
              const task = tasks[index];
              return (
                <div
                  key={preset.key}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  {/* Row 1: Color dot + Name + Assignee + SP */}
                  <div className="flex items-center gap-2">
                    {/* Color indicator */}
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: preset.color }}
                    />

                    {/* Title */}
                    <Input
                      value={getEffectiveTitle(task, index, baseName)}
                      onChange={(e) => handleTitleChange(index, e.target.value)}
                      placeholder={`Task - ${preset.suffix}`}
                      className="flex-1 h-8 text-body"
                    />

                    {/* Assignee picker (compact) */}
                    <Select
                      value={task.assigneeId || 'none'}
                      onValueChange={(val) =>
                        updateTask(index, {
                          assigneeId: val === 'none' ? null : val,
                        })
                      }
                    >
                      <SelectTrigger className="w-[160px] h-8">
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No assignee</SelectItem>
                        {boardMembers.map((member) => (
                          <SelectItem
                            key={member.userId}
                            value={member.userId}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-4 w-4">
                                <AvatarImage
                                  src={member.user.image || undefined}
                                />
                                <AvatarFallback className="text-[8px]">
                                  {member.user.name?.[0] ||
                                    member.user.email[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">
                                {member.user.name || member.user.email}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Story points (Fibonacci) */}
                    <Select
                      value={task.storyPoints !== null ? String(task.storyPoints) : 'none'}
                      onValueChange={(val) =>
                        updateTask(index, {
                          storyPoints: val === 'none' ? null : Number(val),
                        })
                      }
                    >
                      <SelectTrigger className="w-16 h-8">
                        <SelectValue placeholder="SP" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {STORY_POINT_VALUES.map((sp) => (
                          <SelectItem key={sp} value={String(sp)}>
                            {sp}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Row 2: Destination mode + lists */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={task.destinationMode}
                      onValueChange={(val) =>
                        updateTask(index, {
                          destinationMode: val as TaskReleaseMode,
                        })
                      }
                    >
                      <SelectTrigger className="w-[160px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IMMEDIATE">Send now</SelectItem>
                        <SelectItem value="STAGED">
                          Stage for release
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {task.destinationMode === 'IMMEDIATE' ? (
                      <Select
                        value={task.listId}
                        onValueChange={(val) =>
                          updateTask(index, { listId: val })
                        }
                      >
                        <SelectTrigger className="flex-1 h-8">
                          <SelectValue placeholder="Target task list" />
                        </SelectTrigger>
                        <SelectContent>
                          {taskLists.map((list) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <>
                        <Select
                          value={task.stagingPlanningListId}
                          onValueChange={(val) =>
                            updateTask(index, { stagingPlanningListId: val })
                          }
                        >
                          <SelectTrigger className="flex-1 h-8">
                            <SelectValue placeholder="Staging planning list" />
                          </SelectTrigger>
                          <SelectContent>
                            {planningLists.map((list) => (
                              <SelectItem key={list.id} value={list.id}>
                                {list.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={task.releaseTargetListId}
                          onValueChange={(val) =>
                            updateTask(index, { releaseTargetListId: val })
                          }
                        >
                          <SelectTrigger className="flex-1 h-8">
                            <SelectValue placeholder="Release task list" />
                          </SelectTrigger>
                          <SelectContent>
                            {taskLists.map((list) => (
                              <SelectItem key={list.id} value={list.id}>
                                {list.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}

                    {/* Description toggle */}
                    <button
                      onClick={() =>
                        updateTask(index, {
                          descriptionExpanded: !task.descriptionExpanded,
                        })
                      }
                      className="shrink-0 rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-secondary transition-colors"
                      title="Toggle description"
                    >
                      {task.descriptionExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Expandable description */}
                  {task.descriptionExpanded && (
                    <textarea
                      value={task.description}
                      onChange={(e) =>
                        updateTask(index, { description: e.target.value })
                      }
                      placeholder="Optional description..."
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-body placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      rows={2}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !baseName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create All 3 Tasks'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
