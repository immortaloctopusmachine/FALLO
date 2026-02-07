'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { TimelineEvent } from './TimelineEvent';
import type { TimelineEvent as TimelineEventType } from '@/types';
import { formatDisplayDate } from '@/lib/date-utils';

interface TimelineEventsRowProps {
  events: TimelineEventType[];
  startDate: Date;
  columnWidth: number;
  rowHeight: number;
  onEventClick?: (event: TimelineEventType) => void;
  onEventEdit?: (event: TimelineEventType) => void;
  onEventDelete?: (event: TimelineEventType) => void;
  onAddEvent?: (date: Date) => void;
  onEventMove?: (eventId: string, daysDelta: number) => void;
  selectedEventId?: string;
  totalColumns: number;
  isAdmin?: boolean;
}

export function TimelineEventsRow({
  events,
  startDate,
  columnWidth,
  rowHeight,
  onEventClick,
  onEventEdit,
  onEventDelete,
  onAddEvent,
  onEventMove,
  selectedEventId,
  totalColumns,
  isAdmin = false,
}: TimelineEventsRowProps) {
  // Drag state for events
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  // Context menu state for existing events
  const [eventContextMenu, setEventContextMenu] = useState<{
    event: TimelineEventType;
    x: number;
    y: number;
  } | null>(null);

  // Context menu state for empty area (add event)
  const [emptyContextMenu, setEmptyContextMenu] = useState<{
    date: Date;
    x: number;
    y: number;
  } | null>(null);

  // Calculate date from click position
  const getDateFromPosition = useCallback((clientX: number, rowElement: HTMLElement): Date => {
    const rect = rowElement.getBoundingClientRect();
    const relativeX = clientX - rect.left + rowElement.scrollLeft;
    const columnIndex = Math.floor(relativeX / columnWidth);

    // Calculate the actual date (accounting for weekends)
    let businessDaysCount = 0;
    const current = new Date(startDate);

    while (businessDaysCount < columnIndex) {
      current.setDate(current.getDate() + 1);
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDaysCount++;
      }
    }

    // Make sure we're on a business day
    while (current.getDay() === 0 || current.getDay() === 6) {
      current.setDate(current.getDate() + 1);
    }

    return current;
  }, [columnWidth, startDate]);

  // Handle event context menu (right-click on existing event)
  const handleEventContextMenu = useCallback((event: TimelineEventType, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEmptyContextMenu(null);
    setEventContextMenu({
      event,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  // Handle empty area context menu (right-click to add event)
  const handleRowContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAdmin) return;

    e.preventDefault();
    setEventContextMenu(null);

    const date = getDateFromPosition(e.clientX, e.currentTarget);
    setEmptyContextMenu({
      date,
      x: e.clientX,
      y: e.clientY,
    });
  }, [isAdmin, getDateFromPosition]);

  // Close context menus
  useEffect(() => {
    const handleClick = () => {
      setEventContextMenu(null);
      setEmptyContextMenu(null);
    };
    if (eventContextMenu || emptyContextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [eventContextMenu, emptyContextMenu]);

  // Handle drag start for events
  const handleDragStart = useCallback((event: TimelineEventType, e: React.MouseEvent) => {
    if (!isAdmin) return;
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragOffset(0);
    setDraggedEventId(event.id);
  }, [isAdmin]);

  // Handle drag move and end
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX;
      // Snap to day boundaries (single column)
      const daySnap = Math.round(delta / columnWidth) * columnWidth;
      setDragOffset(daySnap);
    };

    const handleMouseUp = () => {
      const daysDelta = Math.round(dragOffset / columnWidth);

      if (daysDelta !== 0 && draggedEventId && onEventMove) {
        onEventMove(draggedEventId, daysDelta);
      }

      setIsDragging(false);
      setDragOffset(0);
      setDraggedEventId(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartX, dragOffset, draggedEventId, columnWidth, onEventMove]);

  // Generate CSS background for grid lines
  const gridBackground = useMemo(() => {
    const weekWidth = columnWidth * 5;
    return {
      backgroundImage: `
        repeating-linear-gradient(
          to right,
          transparent,
          transparent ${columnWidth - 1}px,
          var(--border-subtle) ${columnWidth - 1}px,
          var(--border-subtle) ${columnWidth}px
        ),
        repeating-linear-gradient(
          to right,
          transparent,
          transparent ${weekWidth - 2}px,
          var(--border) ${weekWidth - 2}px,
          var(--border) ${weekWidth}px
        )
      `,
      backgroundSize: `${columnWidth}px 100%, ${weekWidth}px 100%`,
    };
  }, [columnWidth]);

  // Format date for display
  return (
    <div
      className="relative border-b border-border-subtle bg-surface-subtle/30 w-full"
      style={{
        height: rowHeight,
        ...gridBackground,
      }}
      onContextMenu={handleRowContextMenu}
    >
      {/* Events */}
      {events.map((event) => {
        const eventIsDragging = isDragging && draggedEventId === event.id;
        return (
          <TimelineEvent
            key={event.id}
            event={event}
            startDate={startDate}
            columnWidth={columnWidth}
            rowHeight={rowHeight}
            onClick={() => onEventClick?.(event)}
            onContextMenu={(e) => isAdmin && handleEventContextMenu(event, e)}
            onDragStart={isAdmin ? handleDragStart : undefined}
            isSelected={selectedEventId === event.id}
            isDragging={eventIsDragging}
            dragOffset={eventIsDragging ? dragOffset : 0}
          />
        );
      })}

      {/* Event Context menu (for existing events) */}
      {eventContextMenu && (
        <div
          className="fixed bg-surface border border-border rounded-md shadow-lg py-1 z-50"
          style={{ left: eventContextMenu.x, top: eventContextMenu.y }}
        >
          <button
            className="w-full px-3 py-1.5 text-left text-body hover:bg-surface-hover"
            onClick={() => {
              onEventEdit?.(eventContextMenu.event);
              setEventContextMenu(null);
            }}
          >
            Edit Event
          </button>
          <hr className="my-1 border-border" />
          <button
            className="w-full px-3 py-1.5 text-left text-body text-error hover:bg-surface-hover"
            onClick={() => {
              onEventDelete?.(eventContextMenu.event);
              setEventContextMenu(null);
            }}
          >
            Delete Event
          </button>
        </div>
      )}

      {/* Empty area Context menu (add event at date) */}
      {emptyContextMenu && (
        <div
          className="fixed bg-surface border border-border rounded-md shadow-lg py-1 z-50"
          style={{ left: emptyContextMenu.x, top: emptyContextMenu.y }}
        >
          <div className="px-3 py-1 text-caption text-text-tertiary border-b border-border">
            {formatDisplayDate(emptyContextMenu.date, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <button
            className="w-full px-3 py-1.5 text-left text-body hover:bg-surface-hover"
            onClick={() => {
              onAddEvent?.(emptyContextMenu.date);
              setEmptyContextMenu(null);
            }}
          >
            Add Event
          </button>
        </div>
      )}
    </div>
  );
}
