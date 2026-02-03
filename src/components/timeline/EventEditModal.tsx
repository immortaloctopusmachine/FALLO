'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { TimelineEvent, EventType } from '@/types';

interface EventEditModalProps {
  event: TimelineEvent | null;
  boardId: string;
  eventTypes: EventType[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventId: string | null, data: {
    title: string;
    description?: string | null;
    eventTypeId: string;
    startDate: string;
    endDate: string;
  }) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
  defaultDate?: Date;
}

export function EventEditModal({
  event,
  boardId: _boardId,
  eventTypes,
  isOpen,
  onClose,
  onSave,
  onDelete,
  defaultDate,
}: EventEditModalProps) {
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEventTypeId, setSelectedEventTypeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreating = !event;

  // Populate form when event changes or opening for create
  useEffect(() => {
    if (isOpen) {
      if (event) {
        // Editing existing event
        setDescription(event.description || '');
        setStartDate(new Date(event.startDate).toISOString().split('T')[0]);
        setEndDate(new Date(event.endDate).toISOString().split('T')[0]);
        setSelectedEventTypeId(event.eventType.id);
      } else {
        // Creating new event
        setDescription('');
        const dateStr = defaultDate
          ? defaultDate.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        setStartDate(dateStr);
        setEndDate(dateStr);
        // Default to first event type
        setSelectedEventTypeId(eventTypes[0]?.id || '');
      }
      setError(null);
    }
  }, [event, isOpen, defaultDate, eventTypes]);

  const selectedEventType = eventTypes.find(et => et.id === selectedEventTypeId);

  const handleSave = useCallback(async () => {
    if (!selectedEventTypeId) {
      setError('Event type is required');
      return;
    }
    if (!startDate) {
      setError('Start date is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Use event type name as title (required by API)
      const eventType = eventTypes.find(et => et.id === selectedEventTypeId);
      await onSave(event?.id || null, {
        title: eventType?.name || 'Event',
        description: description.trim() || null,
        eventTypeId: selectedEventTypeId,
        startDate,
        endDate: endDate || startDate,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save event:', err);
      setError('Failed to save event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [event, description, selectedEventTypeId, startDate, endDate, eventTypes, onSave, onClose]);

  const handleDelete = useCallback(async () => {
    if (!event) return;

    setIsLoading(true);
    try {
      await onDelete(event.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error('Failed to delete event:', err);
      setError('Failed to delete event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [event, onDelete, onClose]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEventType ? (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-tiny font-bold"
                  style={{
                    backgroundColor: selectedEventType.color,
                    color: '#ffffff',
                  }}
                >
                  {selectedEventType.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-text-tertiary" />
              )}
              {isCreating ? 'Add Timeline Event' : 'Edit Timeline Event'}
            </DialogTitle>
            <DialogDescription>
              {isCreating
                ? 'Add a milestone or deadline marker to the timeline.'
                : 'Modify event type or date.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Event Type */}
            <div className="space-y-2">
              <Label>Event Type</Label>
              <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                {eventTypes.map((et) => {
                  const firstLetter = et.name.charAt(0).toUpperCase();
                  return (
                    <button
                      key={et.id}
                      type="button"
                      onClick={() => setSelectedEventTypeId(et.id)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-md border-2 text-center transition-colors',
                        selectedEventTypeId === et.id
                          ? 'border-success bg-success/10'
                          : 'border-border hover:border-success/50'
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-body font-bold"
                        style={{
                          backgroundColor: et.color,
                          color: '#ffffff',
                        }}
                      >
                        {firstLetter}
                      </div>
                      <span className={cn(
                        'text-tiny truncate w-full',
                        selectedEventTypeId === et.id && 'text-success font-medium'
                      )}>{et.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Display (read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <div className="px-3 py-2 bg-surface-subtle rounded-md border border-border">
                <span className="text-body text-text-primary">
                  {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }) : 'No date selected'}
                </span>
              </div>
              <p className="text-caption text-text-tertiary">
                {isCreating
                  ? 'Event will be placed at the selected date on the timeline.'
                  : 'Drag the event on the timeline to change its date.'}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="event-description">Notes (optional)</Label>
              <Textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this event..."
                rows={2}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="text-caption text-error">{error}</div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-border mt-4">
            {!isCreating ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-error hover:text-error hover:bg-error/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading || !selectedEventTypeId}>
                {isLoading ? 'Saving...' : isCreating ? 'Add Event' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {event && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Timeline Event?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this {event.eventType.name} event.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-error hover:bg-error/90"
              >
                {isLoading ? 'Deleting...' : 'Delete Event'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
