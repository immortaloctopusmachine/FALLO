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

  const isOverdue = date && date < new Date();
  const isUpcoming = date && !isOverdue && date < new Date(Date.now() + 24 * 60 * 60 * 1000);

  return (
    <div className="flex items-center gap-1">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={date ? 'outline' : 'ghost'}
            size="sm"
            className={cn(
              'flex-1 justify-start',
              !date && 'text-text-tertiary',
              isOverdue && 'border-error text-error',
              isUpcoming && 'border-warning text-warning'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              <span className="flex-1 text-left">{format(date, 'MMM d, yyyy')}</span>
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
      {date && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-text-tertiary hover:text-text-primary"
          onClick={() => onChange(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
