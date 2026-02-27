'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, UserPlus, X, Check } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type {
  Board,
  BoardMember,
  BoardModuleTemplate,
  Card,
  EpicNamePreset,
  List,
  TaskReleaseMode,
} from '@/types';

interface ModuleTaskSelection {
  taskTemplateId: string;
  destinationMode: TaskReleaseMode;
  immediateListId: string;
  stagingPlanningListId: string;
  releaseTargetListId: string;
  previewAssignedUserIds: string[]; // Preview user assignments
}

interface AddModuleToBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  board: Board; // Need full board for members and project roles
  planningLists: List[];
  taskLists: List[];
  defaultPlanningListId?: string;
  onApplied: (cards: Card[]) => void;
}

const MANUAL_EPIC = '__manual__';

/**
 * Auto-assign users based on task tags and project role assignments.
 * - "static art" tag → assigns users with "Artist" role
 * - "fx/animation" tag → assigns users with "Animator" role
 * - If multiple users have the same role, pick the oldest by joinedAt
 */
function getAutoAssignedUsers(
  tags: string[],
  projectRoleAssignments: NonNullable<Board['settings']['projectRoleAssignments']>,
  boardMembers: BoardMember[]
): string[] {
  const userIds: string[] = [];
  const tagLower = tags.map((t) => t.toLowerCase());

  // Check for "static art" tag → assign Artist
  if (tagLower.some((t) => t.includes('static') && t.includes('art'))) {
    const artistRole = projectRoleAssignments.find((r) =>
      r.roleName.toLowerCase().includes('artist')
    );
    if (artistRole) {
      // Find the member with oldest joinedAt
      const member = boardMembers
        .filter((m) => m.userId === artistRole.userId)
        .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime())[0];
      if (member) userIds.push(member.userId);
    }
  }

  // Check for "fx/animation" tag → assign Animator
  if (tagLower.some((t) => (t.includes('fx') || t.includes('animation')))) {
    const animatorRole = projectRoleAssignments.find((r) =>
      r.roleName.toLowerCase().includes('animator') || r.roleName.toLowerCase().includes('animation')
    );
    if (animatorRole) {
      // Find the member with oldest joinedAt
      const member = boardMembers
        .filter((m) => m.userId === animatorRole.userId)
        .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime())[0];
      if (member) userIds.push(member.userId);
    }
  }

  // Return unique user IDs
  return [...new Set(userIds)];
}

export function AddModuleToBoardModal({
  isOpen,
  onClose,
  boardId,
  board,
  planningLists,
  taskLists,
  defaultPlanningListId,
  onApplied,
}: AddModuleToBoardModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [modules, setModules] = useState<BoardModuleTemplate[]>([]);
  const [epicNames, setEpicNames] = useState<EpicNamePreset[]>([]);
  const [moduleId, setModuleId] = useState('');
  const [planningListId, setPlanningListId] = useState('');
  const [epicSelection, setEpicSelection] = useState<string>(MANUAL_EPIC);
  const [epicName, setEpicName] = useState('');
  const [userStoryTitle, setUserStoryTitle] = useState('');
  const [taskConfig, setTaskConfig] = useState<ModuleTaskSelection[]>([]);
  const previousPlanningListIdRef = useRef('');
  const initializedModuleIdRef = useRef<string | null>(null);

  const selectedModule = useMemo(
    () => modules.find((item) => item.id === moduleId) || null,
    [moduleId, modules]
  );

  const defaultTaskListId = useMemo(() => {
    return taskLists.find((list) => list.phase === 'BACKLOG')?.id || taskLists[0]?.id || '';
  }, [taskLists]);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    Promise.all([
      fetch('/api/settings/modules').then((res) => res.json()),
      fetch('/api/settings/epic-names').then((res) => res.json()),
    ])
      .then(([modulesData, epicsData]) => {
        if (modulesData.success) {
          setModules(modulesData.data);
        }
        if (epicsData.success) {
          setEpicNames(epicsData.data);
        }
      })
      .catch((error) => {
        console.error('Failed to load module data:', error);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setPlanningListId(defaultPlanningListId || planningLists[0]?.id || '');
  }, [isOpen, defaultPlanningListId, planningLists]);

  useEffect(() => {
    if (!isOpen) {
      setModuleId('');
      setEpicSelection(MANUAL_EPIC);
      setEpicName('');
      setUserStoryTitle('');
      setTaskConfig([]);
      previousPlanningListIdRef.current = '';
      initializedModuleIdRef.current = null;
      return;
    }

    if (!selectedModule) {
      setEpicSelection(MANUAL_EPIC);
      setEpicName('');
      setUserStoryTitle('');
      setTaskConfig([]);
      initializedModuleIdRef.current = null;
      return;
    }

    if (initializedModuleIdRef.current === selectedModule.id) {
      return;
    }

    const selectedPlanningListId = planningListId || defaultPlanningListId || planningLists[0]?.id || '';
    previousPlanningListIdRef.current = selectedPlanningListId;
    setEpicName(selectedModule.epicName);
    setUserStoryTitle(selectedModule.symbol);
    setEpicSelection(epicNames.some((item) => item.name === selectedModule.epicName)
      ? selectedModule.epicName
      : MANUAL_EPIC);

    const defaults = selectedModule.taskTemplates.map((task) => {
      // Auto-assign users based on tags and project roles
      const autoAssignedUserIds = getAutoAssignedUsers(task.tags, board.settings?.projectRoleAssignments || [], board.members);

      return {
        taskTemplateId: task.id,
        destinationMode: task.destinationMode,
        immediateListId: defaultTaskListId,
        stagingPlanningListId: selectedPlanningListId,
        releaseTargetListId: defaultTaskListId,
        previewAssignedUserIds: autoAssignedUserIds,
      };
    });
    setTaskConfig(defaults);
    initializedModuleIdRef.current = selectedModule.id;
  }, [isOpen, selectedModule, epicNames, defaultTaskListId, planningListId, defaultPlanningListId, planningLists]);

  useEffect(() => {
    if (!planningListId) return;

    const previousPlanningListId = previousPlanningListIdRef.current;
    previousPlanningListIdRef.current = planningListId;

    setTaskConfig((prev) => prev.map((item) => {
      if (!item.stagingPlanningListId) {
        return { ...item, stagingPlanningListId: planningListId };
      }

      if (
        previousPlanningListId &&
        item.destinationMode === 'STAGED' &&
        item.stagingPlanningListId === previousPlanningListId
      ) {
        return { ...item, stagingPlanningListId: planningListId };
      }

      return item;
    }));
  }, [planningListId]);

  const updateTask = (taskTemplateId: string, updates: Partial<ModuleTaskSelection>) => {
    setTaskConfig((prev) => prev.map((task) => task.taskTemplateId === taskTemplateId ? { ...task, ...updates } : task));
  };

  const canApply = !!selectedModule && !!planningListId && !!epicName.trim() && taskConfig.length > 0 && taskConfig.every((task) => {
    if (task.destinationMode === 'IMMEDIATE') {
      return !!task.immediateListId;
    }
    return !!task.stagingPlanningListId && !!task.releaseTargetListId;
  });

  const handleApply = async () => {
    if (!selectedModule || !canApply) return;

    setIsApplying(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/modules/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: selectedModule.id,
          planningListId,
          epicName: epicName.trim(),
          userStoryTitle: userStoryTitle.trim() || selectedModule.symbol,
          tasks: taskConfig,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        alert(result.error?.message || 'Failed to apply module');
        return;
      }

      onApplied(result.data.created as Card[]);
      onClose();
    } catch (error) {
      console.error('Failed to apply module:', error);
      alert('Failed to apply module');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Module to Board</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-text-secondary">Loading module templates...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name} ({module.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={planningListId} onValueChange={setPlanningListId}>
                <SelectTrigger>
                  <SelectValue placeholder="User story planning list" />
                </SelectTrigger>
                <SelectContent>
                  {planningLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                value={userStoryTitle}
                onChange={(e) => setUserStoryTitle(e.target.value)}
                placeholder="User story title"
                disabled={!selectedModule}
              />

              <Select
                value={epicSelection}
                onValueChange={(value) => {
                  setEpicSelection(value);
                  if (value !== MANUAL_EPIC) {
                    setEpicName(value);
                  }
                }}
                disabled={!selectedModule}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Epic preset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MANUAL_EPIC}>Manual Epic name</SelectItem>
                  {epicNames.map((epic) => (
                    <SelectItem key={epic.id} value={epic.name}>
                      {epic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={epicName}
                onChange={(e) => setEpicName(e.target.value)}
                placeholder="Epic name"
                disabled={!selectedModule}
              />
            </div>

            {selectedModule?.description && (
              <Textarea
                value={selectedModule.description}
                rows={2}
                readOnly
                className="text-caption"
              />
            )}

            {selectedModule && (
              <div className="space-y-3">
                {selectedModule.taskTemplates.map((task) => {
                  const config = taskConfig.find((item) => item.taskTemplateId === task.id);
                  if (!config) return null;

                  return (
                    <div key={task.id} className="rounded-md border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{selectedModule.symbol} - {task.title}</div>
                        <div className="text-caption text-text-tertiary">
                          {task.storyPoints ? `${task.storyPoints} SP` : 'No story points'}
                        </div>
                      </div>

                      <div className="grid gap-2 md:grid-cols-3">
                        <Select
                          value={config.destinationMode}
                          onValueChange={(value) => updateTask(task.id, { destinationMode: value as TaskReleaseMode })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IMMEDIATE">Send now</SelectItem>
                            <SelectItem value="STAGED">Stage for release</SelectItem>
                          </SelectContent>
                        </Select>

                        {config.destinationMode === 'IMMEDIATE' && (
                          <Select
                            value={config.immediateListId}
                            onValueChange={(value) => updateTask(task.id, { immediateListId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Task list" />
                            </SelectTrigger>
                            <SelectContent>
                              {taskLists.map((list) => (
                                <SelectItem key={list.id} value={list.id}>
                                  {list.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {config.destinationMode === 'STAGED' && (
                          <Select
                            value={config.stagingPlanningListId}
                            onValueChange={(value) => updateTask(task.id, { stagingPlanningListId: value })}
                          >
                            <SelectTrigger>
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
                        )}

                        {config.destinationMode === 'STAGED' && (
                          <Select
                            value={config.releaseTargetListId}
                            onValueChange={(value) => updateTask(task.id, { releaseTargetListId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Release target task list" />
                            </SelectTrigger>
                            <SelectContent>
                              {taskLists.map((list) => (
                                <SelectItem key={list.id} value={list.id}>
                                  {list.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Preview User Assignment */}
                      <div className="pt-2 border-t border-border-subtle">
                        <div className="text-caption font-medium text-text-secondary mb-2">
                          Preview Assignment
                          <span className="ml-1 text-text-tertiary font-normal">(activated when moved to Tasks)</span>
                        </div>
                        <div className="space-y-2">
                          {/* Current Assignees */}
                          {config.previewAssignedUserIds.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {config.previewAssignedUserIds.map((userId) => {
                                const member = board.members.find((m) => m.userId === userId);
                                if (!member) return null;
                                return (
                                  <div
                                    key={userId}
                                    className="flex items-center gap-1.5 rounded-full bg-surface-hover py-1 pl-1 pr-2 opacity-60"
                                    title="Preview assignment"
                                  >
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={member.user.image || undefined} />
                                      <AvatarFallback className="text-[10px]">
                                        {member.user.name?.[0] || member.user.email[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-caption">
                                      {member.user.name || member.user.email}
                                    </span>
                                    <button
                                      onClick={() => {
                                        const updated = config.previewAssignedUserIds.filter((id) => id !== userId);
                                        updateTask(task.id, { previewAssignedUserIds: updated });
                                      }}
                                      className="ml-0.5 rounded-full p-0.5 hover:bg-surface"
                                    >
                                      <X className="h-3 w-3 text-text-tertiary" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {/* Add Assignee Popover */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-full justify-start text-text-tertiary h-8">
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add preview assignee
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[240px] p-2" align="start">
                              <div className="space-y-1">
                                <p className="px-2 py-1 text-caption font-medium text-text-secondary">
                                  Board members
                                </p>
                                {board.members.length === 0 ? (
                                  <p className="px-2 py-2 text-caption text-text-tertiary">
                                    No members found
                                  </p>
                                ) : (
                                  board.members.map((member) => {
                                    const assigned = config.previewAssignedUserIds.includes(member.userId);
                                    return (
                                      <button
                                        key={member.id}
                                        onClick={() => {
                                          const updated = assigned
                                            ? config.previewAssignedUserIds.filter((id) => id !== member.userId)
                                            : [...config.previewAssignedUserIds, member.userId];
                                          updateTask(task.id, { previewAssignedUserIds: updated });
                                        }}
                                        className={cn(
                                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                                          'hover:bg-surface-hover',
                                          assigned && 'bg-surface-hover'
                                        )}
                                      >
                                        <Avatar className="h-6 w-6">
                                          <AvatarImage src={member.user.image || undefined} />
                                          <AvatarFallback className="text-xs">
                                            {member.user.name?.[0] || member.user.email[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <p className="truncate text-body">
                                            {member.user.name || member.user.email}
                                          </p>
                                          {member.user.name && (
                                            <p className="truncate text-caption text-text-tertiary">
                                              {member.user.email}
                                            </p>
                                          )}
                                        </div>
                                        {assigned && (
                                          <Check className="h-4 w-4 text-success shrink-0" />
                                        )}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={onClose} disabled={isApplying}>
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={!canApply || isApplying}>
                {isApplying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  'Apply Module'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
