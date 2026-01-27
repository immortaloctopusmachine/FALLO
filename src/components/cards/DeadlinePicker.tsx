'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DeadlinePickerProps {
  deadline: string | null;
  onChange: (deadline: string | null) => void;
}

export function DeadlinePicker({ deadline, onChange }: DeadlinePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const date = deadline ? new Date(deadline) : undefined;

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(selectedDate.toISOString());
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const isOverdue = date && date < new Date();
  const isUpcoming = date && !isOverdue && date < new Date(Date.now() + 24 * 60 * 60 * 1000);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={date ? 'outline' : 'ghost'}
          size="sm"
          className={cn(
            'w-full justify-start',
            !date && 'text-text-tertiary',
            isOverdue && 'border-error text-error',
            isUpcoming && 'border-warning text-warning'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            <>
              <span className="flex-1 text-left">{format(date, 'MMM d, yyyy')}</span>
              <button
                onClick={handleClear}
                className="ml-1 rounded p-0.5 hover:bg-surface-hover"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            'Set deadline'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
