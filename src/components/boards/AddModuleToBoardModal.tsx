'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import type {
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
}

interface AddModuleToBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  planningLists: List[];
  taskLists: List[];
  defaultPlanningListId?: string;
  onApplied: (cards: Card[]) => void;
}

const MANUAL_EPIC = '__manual__';

export function AddModuleToBoardModal({
  isOpen,
  onClose,
  boardId,
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

    const defaults = selectedModule.taskTemplates.map((task) => ({
      taskTemplateId: task.id,
      destinationMode: task.destinationMode,
      immediateListId: defaultTaskListId,
      stagingPlanningListId: selectedPlanningListId,
      releaseTargetListId: defaultTaskListId,
    }));
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
