'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { TimelineMember, UserWeeklyAvailability } from '@/types';
import { getFriday } from '@/lib/date-utils';

interface WeekAvailabilityPopupProps {
  isOpen: boolean;
  onClose: () => void;
  weekStart: Date;
  roleId: string;
  roleName: string;
  roleColor: string | null;
  members: TimelineMember[];
  existingAvailability: UserWeeklyAvailability[];
  boardId: string;
  onSave: (
    boardId: string,
    entries: { userId: string; weekStart: string; dedication: number }[]
  ) => Promise<void>;
}

// Available dedication percentages
const DEDICATION_OPTIONS = [0, 25, 33, 50, 75, 100];

export function WeekAvailabilityPopup({
  isOpen,
  onClose,
  weekStart,
  roleId: _roleId,
  roleName,
  roleColor,
  members,
  existingAvailability,
  boardId,
  onSave,
}: WeekAvailabilityPopupProps) {
  // State for each user's dedication
  const [dedications, setDedications] = useState<Map<string, number>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  // Initialize dedications from existing availability
  useEffect(() => {
    const initial = new Map<string, number>();
    members.forEach(member => {
      const existing = existingAvailability.find(a => a.userId === member.id);
      initial.set(member.id, existing?.dedication ?? 0);
    });
    setDedications(initial);
  }, [members, existingAvailability]);

  // Format date range for display
  const weekEnd = getFriday(weekStart);
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };
  const dateRangeText = `${formatDate(weekStart)} - ${formatDate(weekEnd)}, ${weekStart.getFullYear()}`;

  // Handle dedication change
  const handleDedicationChange = useCallback((userId: string, dedication: number) => {
    setDedications(prev => {
      const next = new Map(prev);
      next.set(userId, dedication);
      return next;
    });
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const entries = Array.from(dedications.entries()).map(([userId, dedication]) => ({
        userId,
        weekStart: weekStart.toISOString().split('T')[0],
        dedication,
      }));

      await onSave(boardId, entries);
      onClose();
    } catch (error) {
      console.error('Failed to save availability:', error);
    } finally {
      setIsSaving(false);
    }
  }, [dedications, weekStart, boardId, onSave, onClose]);

  // Check if any changes were made
  const hasChanges = useCallback(() => {
    for (const member of members) {
      const existing = existingAvailability.find(a => a.userId === member.id);
      const currentDedication = dedications.get(member.id) ?? 0;
      const existingDedication = existing?.dedication ?? 0;
      if (currentDedication !== existingDedication) {
        return true;
      }
    }
    return false;
  }, [members, existingAvailability, dedications]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {roleColor && (
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: roleColor }}
              />
            )}
            {roleName} Availability
          </DialogTitle>
          <DialogDescription>
            Set availability for the week of {dateRangeText}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {members.length === 0 ? (
            <div className="text-center text-text-tertiary py-4">
              No team members with this role
            </div>
          ) : (
            members.map(member => {
              const currentDedication = dedications.get(member.id) ?? 0;

              return (
                <div key={member.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.image || undefined} />
                      <AvatarFallback className="text-caption">
                        {(member.name || member.email)[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-body font-medium">
                      {member.name || member.email}
                    </span>
                  </div>

                  {/* Dedication selector */}
                  <div className="flex gap-1 flex-wrap">
                    {DEDICATION_OPTIONS.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleDedicationChange(member.id, option)}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-caption font-medium transition-colors',
                          currentDedication === option
                            ? 'bg-success text-white'
                            : 'bg-surface-subtle hover:bg-surface-active text-text-secondary'
                        )}
                      >
                        {option}%
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges()}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
