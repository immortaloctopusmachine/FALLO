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
  member: TimelineMember;
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
  member,
  existingAvailability,
  boardId,
  onSave,
}: WeekAvailabilityPopupProps) {
  const [dedication, setDedication] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize dedication from existing availability
  useEffect(() => {
    const existing = existingAvailability.find(a => a.userId === member.id);
    setDedication(existing?.dedication ?? 0);
  }, [member, existingAvailability]);

  // Format date range for display
  const weekEnd = getFriday(weekStart);
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };
  const dateRangeText = `${formatDate(weekStart)} - ${formatDate(weekEnd)}, ${weekStart.getFullYear()}`;

  // Primary role info
  const primaryRole = member.userCompanyRoles[0]?.companyRole;

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(boardId, [{
        userId: member.id,
        weekStart: weekStart.toISOString().split('T')[0],
        dedication,
      }]);
      onClose();
    } catch (error) {
      console.error('Failed to save availability:', error);
    } finally {
      setIsSaving(false);
    }
  }, [dedication, weekStart, boardId, member.id, onSave, onClose]);

  // Check if changed
  const existingDedication = existingAvailability.find(a => a.userId === member.id)?.dedication ?? 0;
  const hasChanges = dedication !== existingDedication;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={member.image || undefined} />
              <AvatarFallback className="text-caption">
                {(member.name || member.email)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {member.name || member.email}
          </DialogTitle>
          <DialogDescription>
            Set availability for the week of {dateRangeText}
            {primaryRole && (
              <span
                className="ml-2 px-2 py-0.5 rounded-full text-tiny font-medium"
                style={{
                  backgroundColor: `${primaryRole.color || '#71717a'}20`,
                  color: primaryRole.color || '#71717a',
                }}
              >
                {primaryRole.name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Dedication selector */}
          <div className="flex gap-2 flex-wrap justify-center">
            {DEDICATION_OPTIONS.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setDedication(option)}
                className={cn(
                  'px-4 py-2 rounded-md text-body font-medium transition-colors',
                  dedication === option
                    ? 'bg-success text-white'
                    : 'bg-surface-subtle hover:bg-surface-active text-text-secondary'
                )}
              >
                {option}%
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
