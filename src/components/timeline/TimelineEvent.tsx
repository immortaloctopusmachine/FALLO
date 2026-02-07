'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getContrastColor } from '@/lib/color-utils';
import type { TimelineEvent as TimelineEventType } from '@/types';

interface TimelineEventProps {
  event: TimelineEventType;
  startDate: Date;
  columnWidth: number;
  rowHeight: number;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDragStart?: (event: TimelineEventType, e: React.MouseEvent) => void;
  isSelected?: boolean;
  isDragging?: boolean;
  dragOffset?: number;
}

export function TimelineEvent({
  event,
  startDate,
  columnWidth,
  rowHeight,
  onClick,
  onContextMenu,
  onDragStart,
  isSelected,
  isDragging = false,
  dragOffset = 0,
}: TimelineEventProps) {
  const { left, width, isSingleDay } = useMemo(() => {
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    const sameDay = eventStart.toDateString() === eventEnd.toDateString();

    // Calculate business days from start
    let daysFromStart = 0;
    const current = new Date(startDate);
    while (current < eventStart) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysFromStart++;
      }
      current.setDate(current.getDate() + 1);
    }

    // Calculate event width in business days
    let eventDays = 0;
    if (sameDay) {
      eventDays = 1;
    } else {
      const eventCurrent = new Date(eventStart);
      while (eventCurrent <= eventEnd) {
        const dayOfWeek = eventCurrent.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          eventDays++;
        }
        eventCurrent.setDate(eventCurrent.getDate() + 1);
      }
    }

    return {
      left: daysFromStart * columnWidth,
      width: sameDay ? columnWidth : eventDays * columnWidth - 4,
      isSingleDay: sameDay,
    };
  }, [event.startDate, event.endDate, startDate, columnWidth]);

  const eventColor = event.eventType.color || '#f59e0b';
  // Use first letter of event type name
  const firstLetter = event.eventType.name.charAt(0).toUpperCase();

  // Track drag state to prevent click firing after drag
  const [wasDragging, setWasDragging] = useState(false);

  useEffect(() => {
    if (!isDragging && wasDragging) {
      const timer = setTimeout(() => setWasDragging(false), 100);
      return () => clearTimeout(timer);
    }
    if (isDragging && !wasDragging) {
      setWasDragging(true);
    }
  }, [isDragging, wasDragging]);

  const handleClick = useCallback(() => {
    if (wasDragging || isDragging) return;
    onClick?.();
  }, [wasDragging, isDragging, onClick]);

  // Handle mousedown for drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && onDragStart) {
      e.preventDefault();
      onDragStart(event, e);
    }
  };

  if (isSingleDay) {
    // Single day event - show as colored circle with first letter
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'absolute cursor-grab z-20',
                isDragging ? 'cursor-grabbing opacity-80 scale-110' : 'hover:scale-110 transition-all',
                isSelected && 'ring-2 ring-primary ring-offset-1 rounded-full'
              )}
              style={{
                left: left + (columnWidth - 20) / 2 + dragOffset,
                top: (rowHeight - 20) / 2,
              }}
              onClick={handleClick}
              onContextMenu={onContextMenu}
              onMouseDown={handleMouseDown}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-tiny font-bold"
                style={{
                  backgroundColor: eventColor,
                  color: getContrastColor(eventColor),
                }}
              >
                {firstLetter}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-caption">
              <div className="font-medium">{event.eventType.name}</div>
              {event.description && (
                <div className="text-text-secondary mt-1 max-w-48">
                  {event.description}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Multi-day event - show as bar with first letter
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'absolute rounded cursor-grab z-20',
              isDragging ? 'cursor-grabbing opacity-80 shadow-lg z-30' : 'hover:shadow-md hover:z-30 transition-all',
              isSelected && 'ring-2 ring-primary ring-offset-1'
            )}
            style={{
              left: left + 2 + dragOffset,
              width,
              height: rowHeight - 4,
              top: 2,
              backgroundColor: eventColor,
            }}
            onClick={!isDragging ? onClick : undefined}
            onContextMenu={onContextMenu}
            onMouseDown={handleMouseDown}
          >
            <div
              className="h-full px-2 flex items-center text-tiny font-bold"
              style={{ color: getContrastColor(eventColor) }}
            >
              {firstLetter}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-caption">
            <div className="font-medium">{event.eventType.name}</div>
            {event.description && (
              <div className="text-text-secondary mt-1 max-w-48">
                {event.description}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
