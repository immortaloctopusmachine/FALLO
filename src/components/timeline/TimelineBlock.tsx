'use client';

import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
import type { TimelineBlock as TimelineBlockType } from '@/types';

interface TimelineBlockProps {
  block: TimelineBlockType;
  startDate: Date;
  columnWidth: number;
  rowHeight: number;
  onClick?: () => void;
  onDragStart?: (block: TimelineBlockType, e: React.MouseEvent) => void;
  onContextMenu?: (block: TimelineBlockType, e: React.MouseEvent) => void;
  onLongPressDrag?: (block: TimelineBlockType, e: React.MouseEvent) => void;
  isSelected?: boolean;
  isDragging?: boolean;
  dragOffset?: number;
  isAdmin?: boolean;
}

// Optimized: Use direct date math instead of loops
function calculateBlockPositionFast(
  blockStartDate: string,
  blockEndDate: string,
  timelineStartDate: Date,
  columnWidth: number
) {
  const blockStart = new Date(blockStartDate);
  const blockEnd = new Date(blockEndDate);
  const timelineStart = new Date(timelineStartDate);

  // Calculate business days between dates using math instead of loops
  // Formula: total days - weekends
  const getBusinessDays = (start: Date, end: Date): number => {
    const startTime = start.getTime();
    const endTime = end.getTime();
    if (endTime < startTime) return 0;

    const msPerDay = 86400000;
    const totalDays = Math.floor((endTime - startTime) / msPerDay);

    // Count complete weeks
    const fullWeeks = Math.floor(totalDays / 7);
    let businessDays = fullWeeks * 5;

    // Handle remaining days
    const remainingDays = totalDays % 7;
    const startDay = start.getDay();

    for (let i = 0; i < remainingDays; i++) {
      const day = (startDay + i) % 7;
      if (day !== 0 && day !== 6) {
        businessDays++;
      }
    }

    return businessDays;
  };

  const daysFromStart = getBusinessDays(timelineStart, blockStart);
  const blockDays = getBusinessDays(blockStart, blockEnd) + 1; // +1 to include end date

  return {
    left: daysFromStart * columnWidth,
    width: Math.max(blockDays * columnWidth - 4, columnWidth - 4),
  };
}

// Memoize contrast color calculation
const contrastColorCache = new Map<string, string>();
function getContrastColor(hexColor: string): string {
  if (contrastColorCache.has(hexColor)) {
    return contrastColorCache.get(hexColor)!;
  }
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const result = luminance > 0.5 ? '#000000' : '#ffffff';
  contrastColorCache.set(hexColor, result);
  return result;
}

// Long press threshold in milliseconds
const LONG_PRESS_THRESHOLD = 400;

function TimelineBlockComponent({
  block,
  startDate,
  columnWidth,
  rowHeight,
  onClick,
  onDragStart,
  onContextMenu,
  onLongPressDrag,
  isSelected,
  isDragging = false,
  dragOffset = 0,
  isAdmin = false,
}: TimelineBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [wasDragging, setWasDragging] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const rightClickPos = useRef<{ clientX: number; clientY: number } | null>(null);

  // Memoize position calculation - only recalc when dates change
  const { left, width } = useMemo(() =>
    calculateBlockPositionFast(
      block.startDate,
      block.endDate,
      startDate,
      columnWidth
    ),
    [block.startDate, block.endDate, startDate, columnWidth]
  );

  // Handle right mouse button down - start long press timer
  const handleMouseDownRight = useCallback((e: React.MouseEvent) => {
    if (!isAdmin || e.button !== 2) return;

    isLongPress.current = false;
    rightClickPos.current = { clientX: e.clientX, clientY: e.clientY };

    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      // Trigger long press drag with the stored position
      if (rightClickPos.current && onLongPressDrag) {
        // Create a synthetic mouse event with the right position
        onLongPressDrag(block, {
          ...e,
          clientX: rightClickPos.current.clientX,
          clientY: rightClickPos.current.clientY,
        } as React.MouseEvent);
      }
    }, LONG_PRESS_THRESHOLD);
  }, [isAdmin, block, onLongPressDrag]);

  // Handle drag start for moving (left click) or long press detection (right click)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isAdmin) return;

    if (e.button === 0) {
      // Left click - normal drag start
      e.preventDefault();
      e.stopPropagation();
      onDragStart?.(block, e);
    } else if (e.button === 2) {
      // Right click - start long press timer
      handleMouseDownRight(e);
    }
  }, [isAdmin, block, onDragStart, handleMouseDownRight]);

  // Handle mouse up - clear timer
  useEffect(() => {
    const handleMouseUp = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Handle right-click context menu - only show if not long pressing
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!isAdmin) return;
    e.preventDefault();

    // Clear the timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Only show context menu if it wasn't a long press
    if (!isLongPress.current && !isDragging) {
      onContextMenu?.(block, e);
    }

    // Reset long press flag
    isLongPress.current = false;
  }, [isAdmin, block, onContextMenu, isDragging]);

  // Track when drag ends to prevent click
  useEffect(() => {
    if (!isDragging && wasDragging) {
      const timer = setTimeout(() => setWasDragging(false), 100);
      return () => clearTimeout(timer);
    }
    if (isDragging && !wasDragging) {
      setWasDragging(true);
    }
  }, [isDragging, wasDragging]);

  // Handle click - only if we weren't dragging
  const handleClick = useCallback(() => {
    if (wasDragging || isDragging) return;
    onClick?.();
  }, [wasDragging, isDragging, onClick]);

  const blockColor = block.blockType.color || '#6366f1';
  const textColor = getContrastColor(blockColor);

  // Apply drag offset during dragging
  const displayLeft = left + dragOffset + 2;

  return (
    <div
      ref={blockRef}
      className={cn(
        'absolute rounded-md',
        isAdmin ? 'cursor-grab' : 'cursor-pointer',
        isDragging && 'cursor-grabbing shadow-lg z-20 opacity-90',
        !isDragging && 'hover:shadow-md hover:z-10 transition-shadow',
        isSelected && 'ring-2 ring-primary ring-offset-1'
      )}
      style={{
        left: displayLeft,
        width: Math.max(width, columnWidth - 4),
        height: rowHeight - 8,
        top: 4,
        backgroundColor: blockColor,
        // Use transform for smoother dragging (GPU accelerated)
        willChange: isDragging ? 'transform' : 'auto',
      }}
      onClick={handleClick}
      onMouseDown={isAdmin ? handleMouseDown : undefined}
      onContextMenu={handleContextMenu}
    >
      <div className="h-full px-2 py-1 flex items-center overflow-hidden">
        <span
          className="text-tiny font-medium truncate select-none"
          style={{ color: textColor }}
        >
          {block.blockType.name} {block.position}
        </span>
      </div>
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const TimelineBlock = memo(TimelineBlockComponent);
