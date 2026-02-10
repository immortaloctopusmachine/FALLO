'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Layers, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getContrastColor } from '@/lib/color-utils';
import type { BlockType, CoreProjectTemplate, EventType } from '@/types';

type EditableBlockRow = { blockTypeId: string };
type EditableEventRow = { eventTypeId: string; title: string; unitOffset: number };

interface TemplatesResponse {
  templates: CoreProjectTemplate[];
  blockTypes: BlockType[];
  eventTypes: EventType[];
}

const UNITS_PER_BLOCK = 5;
const UNIT_WIDTH_PX = 48;

async function parseApiResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as {
      success?: boolean;
      data?: unknown;
      error?: { message?: string };
    };
  } catch {
    throw new Error(
      text.startsWith('<!DOCTYPE')
        ? 'Server returned HTML instead of JSON. Refresh and try again.'
        : 'Invalid server response'
    );
  }
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

export default function CoreProjectTemplatesPage() {
  const [templates, setTemplates] = useState<CoreProjectTemplate[]>([]);
  const [blockTypes, setBlockTypes] = useState<BlockType[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [blocks, setBlocks] = useState<EditableBlockRow[]>([]);
  const [events, setEvents] = useState<EditableEventRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalUnits = useMemo(() => blocks.length * UNITS_PER_BLOCK, [blocks]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/settings/core-project-templates');
      const json = await parseApiResponse(response);
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch templates');

      const data = json.data as TemplatesResponse;
      setTemplates(data.templates);
      setBlockTypes(data.blockTypes);
      setEventTypes(data.eventTypes);

      if (!selectedTemplateId && data.templates.length > 0) {
        setSelectedTemplateId(data.templates[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(message);
      console.error('Failed to fetch core templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  useEffect(() => {
    if (!selectedTemplate) {
      setName('');
      setDescription('');
      setBlocks([]);
      setEvents([]);
      return;
    }

    setName(selectedTemplate.name);
    setDescription(selectedTemplate.description || '');
    setBlocks(selectedTemplate.blocks.map((row) => ({ blockTypeId: row.blockTypeId })));
    setEvents(
      selectedTemplate.events.map((row) => ({
        eventTypeId: row.eventTypeId,
        title: row.title || '',
        unitOffset: typeof row.unitOffset === 'number' ? Math.max(0, Math.floor(row.unitOffset)) : row.position * UNITS_PER_BLOCK,
      }))
    );
  }, [selectedTemplate]);

  const moveItem = <T,>(items: T[], from: number, to: number) => {
    if (to < 0 || to >= items.length) return items;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  const getBlockAndDay = useCallback((unitOffset: number) => {
    if (totalUnits <= 0) {
      return { blockIndex: 0, dayInBlock: 1 };
    }
    const clamped = clampInt(unitOffset, 0, totalUnits - 1);
    return {
      blockIndex: Math.floor(clamped / UNITS_PER_BLOCK),
      dayInBlock: (clamped % UNITS_PER_BLOCK) + 1,
    };
  }, [totalUnits]);

  const toUnitOffset = useCallback((blockIndex: number, dayInBlock: number) => {
    const maxBlockIndex = Math.max(0, blocks.length - 1);
    const clampedBlockIndex = clampInt(blockIndex, 0, maxBlockIndex);
    const clampedDay = clampInt(dayInBlock, 1, UNITS_PER_BLOCK);
    return clampedBlockIndex * UNITS_PER_BLOCK + (clampedDay - 1);
  }, [blocks.length]);

  const normalizedEvents = useMemo(
    () => events.map((event) => ({
      ...event,
      unitOffset: totalUnits > 0 ? clampInt(event.unitOffset, 0, totalUnits - 1) : 0,
    })),
    [events, totalUnits]
  );

  const handleCreateTemplate = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/settings/core-project-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Core Template',
          description: '',
          blocks: [],
          events: [],
        }),
      });
      const json = await parseApiResponse(response);
      if (!json.success || !json.data) {
        throw new Error(json.error?.message || 'Failed to create template');
      }

      const created = json.data as { id: string };
      await fetchData();
      setSelectedTemplateId(created.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create template';
      setError(message);
      console.error('Failed to create template:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    if (blocks.some((block) => !block.blockTypeId)) {
      setError('Each block row must have a block type');
      return;
    }
    if (normalizedEvents.some((event) => !event.eventTypeId)) {
      setError('Each event row must have an event type');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/settings/core-project-templates/${selectedTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          blocks,
          events: normalizedEvents.map((event) => ({
            eventTypeId: event.eventTypeId,
            title: event.title.trim() || null,
            unitOffset: event.unitOffset,
          })),
        }),
      });
      const json = await parseApiResponse(response);
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to save template');
      }

      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save template';
      setError(message);
      console.error('Failed to save template:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    if (!window.confirm(`Delete template "${selectedTemplate.name}"?`)) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/settings/core-project-templates/${selectedTemplate.id}`, {
        method: 'DELETE',
      });
      const json = await parseApiResponse(response);
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to delete template');
      }

      const deletedId = selectedTemplate.id;
      await fetchData();
      setSelectedTemplateId((current) => (current === deletedId ? '' : current));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template';
      setError(message);
      console.error('Failed to delete template:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveTemplate = async (direction: -1 | 1) => {
    if (!selectedTemplate) return;
    const index = templates.findIndex((t) => t.id === selectedTemplate.id);
    const to = index + direction;
    if (to < 0 || to >= templates.length) return;

    const target = templates[to];
    setIsSaving(true);
    setError(null);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/settings/core-project-templates/${selectedTemplate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: to }),
        }),
        fetch(`/api/settings/core-project-templates/${target.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: index }),
        }),
      ]);
      const [j1, j2] = await Promise.all([parseApiResponse(r1), parseApiResponse(r2)]);
      if (!j1.success || !j2.success) {
        throw new Error('Failed to reorder templates');
      }
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reorder templates';
      setError(message);
      console.error('Failed to reorder templates:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const addBlock = () => {
    setBlocks((prev) => [...prev, { blockTypeId: blockTypes[0]?.id || '' }]);
  };

  const addEvent = () => {
    const defaultOffset = totalUnits > 0 ? totalUnits - 1 : 0;
    setEvents((prev) => [
      ...prev,
      { eventTypeId: eventTypes[0]?.id || '', title: '', unitOffset: defaultOffset },
    ]);
  };

  if (isLoading) {
    return <div className="text-text-secondary">Loading core templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-title font-semibold">Core Project Templates</h2>
          <p className="text-body text-text-secondary mt-1">
            Build a date-agnostic timeline blueprint with blocks and events anchored to block-day units.
          </p>
        </div>
        <Button onClick={handleCreateTemplate} disabled={isSaving}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="rounded-lg border border-border bg-surface p-2 space-y-1">
          {templates.map((template) => (
            <button
              key={template.id}
              className={cn(
                'w-full text-left rounded-md px-3 py-2 transition-colors',
                selectedTemplateId === template.id
                  ? 'bg-card-epic/10 text-card-epic'
                  : 'hover:bg-surface-hover text-text-primary'
              )}
              onClick={() => setSelectedTemplateId(template.id)}
            >
              <div className="font-medium">{template.name}</div>
              {template.description ? (
                <div className="text-caption text-text-secondary truncate">{template.description}</div>
              ) : null}
            </button>
          ))}
        </div>

        {selectedTemplate ? (
          <div className="rounded-lg border border-border bg-surface p-4 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => handleMoveTemplate(-1)} disabled={isSaving}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleMoveTemplate(1)} disabled={isSaving}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={handleDeleteTemplate} disabled={selectedTemplate.isDefault || isSaving}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button onClick={handleSaveTemplate} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-body font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Block Sequence
                </h3>
                <Button variant="outline" size="sm" onClick={addBlock}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Block
                </Button>
              </div>

              <div className="space-y-2">
                {blocks.map((block, index) => {
                  const blockType = blockTypes.find((type) => type.id === block.blockTypeId) || null;
                  return (
                    <div key={`block-${index}`} className="flex items-center gap-2">
                      <div
                        className="flex-1 rounded-md px-3 py-2 border border-border text-tiny font-medium"
                        style={{
                          backgroundColor: `${blockType?.color || '#6366f1'}22`,
                          color: blockType?.color || '#111827',
                        }}
                      >
                        <Select
                          value={block.blockTypeId}
                          onValueChange={(value) =>
                            setBlocks((prev) => prev.map((row, idx) => (idx === index ? { ...row, blockTypeId: value } : row)))
                          }
                        >
                          <SelectTrigger className="h-8 bg-transparent border-0 px-0">
                            <SelectValue placeholder="Select block type" />
                          </SelectTrigger>
                          <SelectContent>
                            {blockTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => setBlocks((prev) => moveItem(prev, index, index - 1))}>
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setBlocks((prev) => moveItem(prev, index, index + 1))}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => setBlocks((prev) => prev.filter((_, idx) => idx !== index))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-body font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline Layout Preview
                </h3>
              </div>

              <div className="rounded-lg border border-border bg-background/40 p-3 overflow-x-auto">
                {blocks.length === 0 ? (
                  <p className="text-caption text-text-secondary">Add blocks to build the timeline layout.</p>
                ) : (
                  <div
                    className="relative"
                    style={{ width: `${Math.max(totalUnits * UNIT_WIDTH_PX, 560)}px` }}
                  >
                    <div className="mb-2 flex text-[10px] text-text-tertiary">
                      {Array.from({ length: totalUnits }).map((_, unit) => (
                        <div
                          key={`unit-${unit}`}
                          className="border-r border-border/60 text-center"
                          style={{ width: `${UNIT_WIDTH_PX}px` }}
                        >
                          {unit + 1}
                        </div>
                      ))}
                    </div>

                    <div className="relative h-9 mb-2">
                      {blocks.map((block, index) => {
                        const blockType = blockTypes.find((type) => type.id === block.blockTypeId);
                        const left = index * UNITS_PER_BLOCK * UNIT_WIDTH_PX;
                        const width = UNITS_PER_BLOCK * UNIT_WIDTH_PX - 4;
                        const background = blockType?.color || '#6b7280';
                        const textColor = getContrastColor(background);
                        return (
                          <div
                            key={`preview-block-${index}`}
                            className="absolute rounded-md px-2 py-1 text-xs font-medium"
                            style={{
                              left,
                              width,
                              backgroundColor: background,
                              color: textColor,
                              top: 0,
                              height: '100%',
                            }}
                          >
                            {blockType?.name || `Block ${index + 1}`}
                          </div>
                        );
                      })}
                    </div>

                    <div className="relative h-10 border-t border-border/70 pt-2">
                      {normalizedEvents.map((event, index) => {
                        const eventType = eventTypes.find((type) => type.id === event.eventTypeId);
                        const left = event.unitOffset * UNIT_WIDTH_PX + UNIT_WIDTH_PX / 2 - 12;
                        const color = eventType?.color || '#6366f1';
                        return (
                          <div
                            key={`preview-event-${index}`}
                            className="absolute h-6 min-w-6 rounded-full px-1.5 flex items-center justify-center text-[10px] font-semibold"
                            style={{
                              left,
                              backgroundColor: color,
                              color: getContrastColor(color),
                            }}
                            title={`${eventType?.name || 'Event'} on unit ${event.unitOffset + 1}`}
                          >
                            {(event.title || eventType?.name || 'E').slice(0, 1).toUpperCase()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-body font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Event Placement
                </h3>
                <Button variant="outline" size="sm" onClick={addEvent} disabled={blocks.length === 0}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Event
                </Button>
              </div>

              {blocks.length === 0 ? (
                <p className="text-caption text-text-secondary">Add at least one block before placing events.</p>
              ) : (
                <div className="space-y-2">
                  {events.map((event, index) => {
                    const { blockIndex, dayInBlock } = getBlockAndDay(event.unitOffset);
                    return (
                      <div key={`event-${index}`} className="grid grid-cols-[1fr_1fr_120px_100px_auto_auto_auto] gap-2 items-center">
                        <Select
                          value={event.eventTypeId}
                          onValueChange={(value) =>
                            setEvents((prev) =>
                              prev.map((row, idx) => (idx === index ? { ...row, eventTypeId: value } : row))
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Event type" />
                          </SelectTrigger>
                          <SelectContent>
                            {eventTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          value={event.title}
                          onChange={(e) =>
                            setEvents((prev) =>
                              prev.map((row, idx) => (idx === index ? { ...row, title: e.target.value } : row))
                            )
                          }
                          placeholder="Optional title"
                        />

                        <Select
                          value={String(blockIndex)}
                          onValueChange={(value) => {
                            const nextBlock = Number.parseInt(value, 10);
                            const unitOffset = toUnitOffset(nextBlock, dayInBlock);
                            setEvents((prev) =>
                              prev.map((row, idx) => (idx === index ? { ...row, unitOffset } : row))
                            );
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Block" />
                          </SelectTrigger>
                          <SelectContent>
                            {blocks.map((blockRow, blockRowIndex) => {
                              const blockType = blockTypes.find((type) => type.id === blockRow.blockTypeId);
                              return (
                                <SelectItem key={`event-block-${index}-${blockRowIndex}`} value={String(blockRowIndex)}>
                                  {blockType?.name || `Block ${blockRowIndex + 1}`} {blockRowIndex + 1}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>

                        <Select
                          value={String(dayInBlock)}
                          onValueChange={(value) => {
                            const nextDay = Number.parseInt(value, 10);
                            const unitOffset = toUnitOffset(blockIndex, nextDay);
                            setEvents((prev) =>
                              prev.map((row, idx) => (idx === index ? { ...row, unitOffset } : row))
                            );
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Day" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: UNITS_PER_BLOCK }).map((_, day) => (
                              <SelectItem key={`day-${day + 1}`} value={String(day + 1)}>
                                Day {day + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button variant="outline" size="icon" onClick={() => setEvents((prev) => moveItem(prev, index, index - 1))}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setEvents((prev) => moveItem(prev, index, index + 1))}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setEvents((prev) => prev.filter((_, idx) => idx !== index))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface p-6 text-text-secondary">
            Select a template to edit.
          </div>
        )}
      </div>
    </div>
  );
}
