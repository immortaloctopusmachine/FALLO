'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { TimelineBlock } from './TimelineBlock';
import { TimelineEvent } from './TimelineEvent';
import type { TimelineBlock as TimelineBlockType, TimelineEvent as TimelineEventType } from '@/types';

// Constants for 5-day week snapping
const DAYS_PER_WEEK = 5; // Business days

interface TimelineProjectRowProps {
  blocks: TimelineBlockType[];
  events: TimelineEventType[];
  startDate: Date;
  columnWidth: number;
  rowHeight: number;
  onBlockClick?: (block: TimelineBlockType) => void;
  onBlockGroupMove?: (blockIds: string[], weeksDelta: number) => void;
  onBlockDelete?: (block: TimelineBlockType) => void;
  onBlockInsert?: (atBlock: TimelineBlockType) => void;
  onEventClick?: (event: TimelineEventType) => void;
  onEventEdit?: (event: TimelineEventType) => void;
  onEventDelete?: (event: TimelineEventType) => void;
  onAddEvent?: (date?: Date) => void;
  selectedBlockId?: string;
  selectedEventId?: string;
  totalColumns: number;
  minWidth?: string;
  isAdmin?: boolean;
}

export function TimelineProjectRow({
  blocks,
  events,
  startDate,
  columnWidth,
  rowHeight,
  onBlockClick,
  onBlockGroupMove,
  onBlockDelete,
  onBlockInsert,
  onEventClick,
  onEventEdit,
  onEventDelete,
  onAddEvent,
  selectedBlockId,
  selectedEventId,
  totalColumns: _totalColumns,
  minWidth,
  isAdmin = false,
}: TimelineProjectRowProps) {
  // Sort blocks by start date to determine order
  const sortedBlocks = useMemo(() => {
    return [...blocks].sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }, [blocks]);

  // Drag state - managed at row level for group dragging
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  // Context menu state for blocks
  const [contextMenu, setContextMenu] = useState<{
    block: TimelineBlockType;
    x: number;
    y: number;
  } | null>(null);

  // Context menu state for events
  const [eventContextMenu, setEventContextMenu] = useState<{
    event: TimelineEventType;
    x: number;
    y: number;
  } | null>(null);

  // Get blocks that should move together (block and all blocks to the right)
  const getBlocksToMove = useCallback((blockId: string) => {
    const blockIndex = sortedBlocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return [];
    // Return this block and all blocks to the right
    return sortedBlocks.slice(blockIndex);
  }, [sortedBlocks]);

  // Handle drag start
  const handleDragStart = useCallback((block: TimelineBlockType, e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragOffset(0);
    setDraggedBlockId(block.id);
  }, []);

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX;
      // Snap to week boundaries (5 business days)
      const weekWidth = DAYS_PER_WEEK * columnWidth;
      const weekSnap = Math.round(delta / weekWidth) * weekWidth;
      setDragOffset(weekSnap);
    };

    const handleMouseUp = () => {
      const weekWidth = DAYS_PER_WEEK * columnWidth;
      const weeksDelta = Math.round(dragOffset / weekWidth);

      if (weeksDelta !== 0 && draggedBlockId && onBlockGroupMove) {
        // Get all blocks to move (dragged block and those to the right)
        const blocksToMove = getBlocksToMove(draggedBlockId);
        const blockIds = blocksToMove.map(b => b.id);
        onBlockGroupMove(blockIds, weeksDelta);
      }

      setIsDragging(false);
      setDragOffset(0);
      setDraggedBlockId(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartX, dragOffset, draggedBlockId, columnWidth, onBlockGroupMove, getBlocksToMove]);

  // Handle block context menu
  const handleContextMenu = useCallback((block: TimelineBlockType, e: React.MouseEvent) => {
    setEventContextMenu(null);
    setContextMenu({
      block,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  // Handle event context menu
  const handleEventContextMenu = useCallback((event: TimelineEventType, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(null);
    setEventContextMenu({
      event,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  // Close context menus
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setEventContextMenu(null);
    };
    if (contextMenu || eventContextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu, eventContextMenu]);

  // Pre-compute the set of dragging block IDs for O(1) lookup
  const draggingBlockIds = useMemo(() => {
    if (!isDragging || !draggedBlockId) return new Set<string>();
    const blocksToMove = getBlocksToMove(draggedBlockId);
    return new Set(blocksToMove.map(b => b.id));
  }, [isDragging, draggedBlockId, getBlocksToMove]);

  // Generate CSS background for grid lines (much more performant than DOM elements)
  const gridBackground = useMemo(() => {
    // Week separator positions (every 5 business days = Monday)
    const weekWidth = columnWidth * 5;

    // Create repeating gradient for daily lines and weekly borders
    // Daily lines: thin gray
    // Weekly lines: slightly thicker
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

  return (
    <div
      className="relative border-b border-border-subtle"
      style={{
        height: rowHeight,
        minWidth: minWidth || '100%',
        // Use CSS background for grid lines (much faster than DOM elements)
        ...gridBackground,
      }}
    >

      {/* Today indicator */}
      <TodayIndicator
        startDate={startDate}
        columnWidth={columnWidth}
      />

      {/* Events row at top */}
      {events.length > 0 && (
        <div className="absolute inset-x-0 top-0" style={{ height: rowHeight / 2 }}>
          {events.map((event) => (
            <TimelineEvent
              key={event.id}
              event={event}
              startDate={startDate}
              columnWidth={columnWidth}
              rowHeight={rowHeight / 2}
              onClick={() => onEventClick?.(event)}
              onContextMenu={(e) => isAdmin && handleEventContextMenu(event, e)}
              isSelected={selectedEventId === event.id}
            />
          ))}
        </div>
      )}

      {/* Blocks */}
      <div
        className="absolute inset-x-0"
        style={{
          top: events.length > 0 ? rowHeight / 2 : 0,
          height: events.length > 0 ? rowHeight / 2 : rowHeight,
        }}
      >
        {sortedBlocks.map((block) => {
          const blockIsDragging = draggingBlockIds.has(block.id);
          return (
            <TimelineBlock
              key={block.id}
              block={block}
              startDate={startDate}
              columnWidth={columnWidth}
              rowHeight={events.length > 0 ? rowHeight / 2 : rowHeight}
              onClick={() => onBlockClick?.(block)}
              onDragStart={handleDragStart}
              onContextMenu={handleContextMenu}
              isSelected={selectedBlockId === block.id}
              isDragging={blockIsDragging}
              dragOffset={blockIsDragging ? dragOffset : 0}
              isAdmin={isAdmin}
            />
          );
        })}
      </div>

      {/* Block Context menu */}
      {contextMenu && (
        <div
          className="fixed bg-surface border border-border rounded-md shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-3 py-1.5 text-left text-body hover:bg-surface-hover"
            onClick={() => {
              onBlockClick?.(contextMenu.block);
              setContextMenu(null);
            }}
          >
            Edit Block
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-body hover:bg-surface-hover"
            onClick={() => {
              onBlockInsert?.(contextMenu.block);
              setContextMenu(null);
            }}
          >
            Insert Block Before
          </button>
          {onAddEvent && (
            <button
              className="w-full px-3 py-1.5 text-left text-body hover:bg-surface-hover"
              onClick={() => {
                onAddEvent(new Date(contextMenu.block.startDate));
                setContextMenu(null);
              }}
            >
              Add Event Here
            </button>
          )}
          <hr className="my-1 border-border" />
          <button
            className="w-full px-3 py-1.5 text-left text-body text-error hover:bg-surface-hover"
            onClick={() => {
              onBlockDelete?.(contextMenu.block);
              setContextMenu(null);
            }}
          >
            Delete Block
          </button>
        </div>
      )}

      {/* Event Context menu */}
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
    </div>
  );
}

function TodayIndicator({
  startDate,
  columnWidth,
}: {
  startDate: Date;
  columnWidth: number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate position
  let daysFromStart = 0;
  const current = new Date(startDate);
  while (current < today) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysFromStart++;
    }
    current.setDate(current.getDate() + 1);
  }

  // Check if today is visible
  if (current.toDateString() !== today.toDateString()) {
    return null;
  }

  const left = daysFromStart * columnWidth + columnWidth / 2;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-error z-10"
      style={{ left }}
    />
  );
}
