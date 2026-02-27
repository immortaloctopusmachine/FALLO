'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { TimelineBlock } from './TimelineBlock';
import { TimelineEvent } from './TimelineEvent';
import {
  TimelineEventContextMenu,
  type TimelineEventContextMenuState,
} from './TimelineEventContextMenu';
import { TodayIndicator } from './TodayIndicator';
import { getTimelineGridBackground } from './grid-background';
import { useTimelineBlockGroupDrag, type BlockDragScope } from './useTimelineBlockGroupDrag';
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

  // Context menu state for blocks
  const [contextMenu, setContextMenu] = useState<{
    block: TimelineBlockType;
    x: number;
    y: number;
  } | null>(null);

  // Context menu state for events
  const [eventContextMenu, setEventContextMenu] = useState<TimelineEventContextMenuState | null>(null);

  // Get blocks that should move together (dragged block and all blocks to the right)
  const getBlocksToMove = useCallback(({
    blockId,
    blocks: dragBlocks,
  }: {
    blockId: string;
    scope: BlockDragScope;
    blocks: TimelineBlockType[];
  }) => {
    const blockIndex = dragBlocks.findIndex((block) => block.id === blockId);
    if (blockIndex === -1) return [];
    return dragBlocks.slice(blockIndex);
  }, []);

  const { dragOffset, draggingBlockIds, handleDragStart } = useTimelineBlockGroupDrag({
    blocks: sortedBlocks,
    columnWidth,
    onBlockGroupMove,
    getBlocksToMove,
  });

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

  // Generate CSS background for grid lines (much more performant than DOM elements)
  const gridBackground = useMemo(() => {
    return getTimelineGridBackground(columnWidth, DAYS_PER_WEEK);
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

      <TimelineEventContextMenu
        menu={eventContextMenu}
        onEdit={onEventEdit}
        onDelete={onEventDelete}
        onClose={() => setEventContextMenu(null)}
      />
    </div>
  );
}
