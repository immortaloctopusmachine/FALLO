'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { TimelineBlock } from './TimelineBlock';
import type { TimelineBlock as TimelineBlockType } from '@/types';

// Constants for 5-day week snapping
const DAYS_PER_WEEK = 5; // Business days

interface TimelineBlocksRowProps {
  blocks: TimelineBlockType[];
  startDate: Date;
  columnWidth: number;
  rowHeight: number;
  onBlockClick?: (block: TimelineBlockType) => void;
  onBlockGroupMove?: (blockIds: string[], weeksDelta: number) => void;
  onBlockDelete?: (block: TimelineBlockType) => void;
  onBlockInsert?: (atBlock: TimelineBlockType) => void;
  selectedBlockId?: string;
  totalColumns: number;
  isAdmin?: boolean;
}

export function TimelineBlocksRow({
  blocks,
  startDate,
  columnWidth,
  rowHeight,
  onBlockClick,
  onBlockGroupMove,
  onBlockDelete,
  onBlockInsert,
  selectedBlockId,
  totalColumns,
  isAdmin = false,
}: TimelineBlocksRowProps) {
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

  // Get blocks that should move together
  // - Normal drag: block and all blocks to the right
  // - All blocks drag: ALL blocks in the row
  const getBlocksToMove = useCallback((blockId: string, allBlocks: boolean = false) => {
    if (allBlocks) {
      return sortedBlocks;
    }
    const blockIndex = sortedBlocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return [];
    return sortedBlocks.slice(blockIndex);
  }, [sortedBlocks]);

  // Track if this is an "all blocks" drag (from long press right-click)
  const [isAllBlocksDrag, setIsAllBlocksDrag] = useState(false);

  // Handle drag start
  const handleDragStart = useCallback((block: TimelineBlockType, e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragOffset(0);
    setDraggedBlockId(block.id);
    setIsAllBlocksDrag(false);
  }, []);

  // Handle long press drag - moves ALL blocks (entire section)
  const handleLongPressDrag = useCallback((block: TimelineBlockType, e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragOffset(0);
    setDraggedBlockId(block.id);
    setIsAllBlocksDrag(true);
  }, []);

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX;
      const weekWidth = DAYS_PER_WEEK * columnWidth;
      const weekSnap = Math.round(delta / weekWidth) * weekWidth;
      setDragOffset(weekSnap);
    };

    const handleMouseUp = () => {
      const weekWidth = DAYS_PER_WEEK * columnWidth;
      const weeksDelta = Math.round(dragOffset / weekWidth);

      if (weeksDelta !== 0 && draggedBlockId && onBlockGroupMove) {
        // If all blocks drag, move all blocks; otherwise move from clicked block onwards
        const blocksToMove = getBlocksToMove(draggedBlockId, isAllBlocksDrag);
        const blockIds = blocksToMove.map(b => b.id);
        onBlockGroupMove(blockIds, weeksDelta);
      }

      setIsDragging(false);
      setDragOffset(0);
      setDraggedBlockId(null);
      setIsAllBlocksDrag(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartX, dragOffset, draggedBlockId, columnWidth, onBlockGroupMove, getBlocksToMove, isAllBlocksDrag]);

  // Handle block context menu
  const handleContextMenu = useCallback((block: TimelineBlockType, e: React.MouseEvent) => {
    setContextMenu({
      block,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  // Close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Pre-compute the set of dragging block IDs for O(1) lookup
  const draggingBlockIds = useMemo(() => {
    if (!isDragging || !draggedBlockId) return new Set<string>();
    const blocksToMove = getBlocksToMove(draggedBlockId, isAllBlocksDrag);
    return new Set(blocksToMove.map(b => b.id));
  }, [isDragging, draggedBlockId, getBlocksToMove, isAllBlocksDrag]);

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

  return (
    <div
      className="relative border-b border-border-subtle w-full"
      style={{
        height: rowHeight,
        ...gridBackground,
      }}
    >
      {/* Today indicator */}
      <TodayIndicator startDate={startDate} columnWidth={columnWidth} />

      {/* Blocks */}
      {sortedBlocks.map((block) => {
        const blockIsDragging = draggingBlockIds.has(block.id);
        return (
          <TimelineBlock
            key={block.id}
            block={block}
            startDate={startDate}
            columnWidth={columnWidth}
            rowHeight={rowHeight}
            onClick={() => onBlockClick?.(block)}
            onDragStart={handleDragStart}
            onContextMenu={handleContextMenu}
            onLongPressDrag={handleLongPressDrag}
            isSelected={selectedBlockId === block.id}
            isDragging={blockIsDragging}
            dragOffset={blockIsDragging ? dragOffset : 0}
            isAdmin={isAdmin}
          />
        );
      })}

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

  let daysFromStart = 0;
  const current = new Date(startDate);
  while (current < today) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysFromStart++;
    }
    current.setDate(current.getDate() + 1);
  }

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
