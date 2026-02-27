import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';

const DAYS_PER_WEEK = 5;

export type BlockDragScope = 'tail' | 'all';

interface UseTimelineBlockGroupDragParams<TBlock extends { id: string }> {
  blocks: TBlock[];
  columnWidth: number;
  onBlockGroupMove?: (blockIds: string[], weeksDelta: number) => void;
  getBlocksToMove: (params: {
    blockId: string;
    scope: BlockDragScope;
    blocks: TBlock[];
  }) => TBlock[];
}

interface UseTimelineBlockGroupDragResult<TBlock extends { id: string }> {
  dragOffset: number;
  draggingBlockIds: Set<string>;
  handleDragStart: (block: TBlock, e: ReactMouseEvent) => void;
  handleAllBlocksDragStart: (block: TBlock, e: ReactMouseEvent) => void;
}

export function useTimelineBlockGroupDrag<TBlock extends { id: string }>({
  blocks,
  columnWidth,
  onBlockGroupMove,
  getBlocksToMove,
}: UseTimelineBlockGroupDragParams<TBlock>): UseTimelineBlockGroupDragResult<TBlock> {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragScope, setDragScope] = useState<BlockDragScope>('tail');

  const startDrag = useCallback((block: TBlock, e: ReactMouseEvent, scope: BlockDragScope) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragOffset(0);
    setDraggedBlockId(block.id);
    setDragScope(scope);
  }, []);

  const handleDragStart = useCallback((block: TBlock, e: ReactMouseEvent) => {
    startDrag(block, e, 'tail');
  }, [startDrag]);

  const handleAllBlocksDragStart = useCallback((block: TBlock, e: ReactMouseEvent) => {
    startDrag(block, e, 'all');
  }, [startDrag]);

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
        const blocksToMove = getBlocksToMove({
          blockId: draggedBlockId,
          scope: dragScope,
          blocks,
        });
        const blockIds = blocksToMove.map((block) => block.id);
        if (blockIds.length > 0) {
          onBlockGroupMove(blockIds, weeksDelta);
        }
      }

      setIsDragging(false);
      setDragOffset(0);
      setDraggedBlockId(null);
      setDragScope('tail');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [blocks, columnWidth, dragOffset, draggedBlockId, dragScope, dragStartX, getBlocksToMove, isDragging, onBlockGroupMove]);

  const draggingBlockIds = useMemo(() => {
    if (!isDragging || !draggedBlockId) {
      return new Set<string>();
    }
    const blocksToMove = getBlocksToMove({
      blockId: draggedBlockId,
      scope: dragScope,
      blocks,
    });
    return new Set(blocksToMove.map((block) => block.id));
  }, [blocks, dragScope, draggedBlockId, getBlocksToMove, isDragging]);

  return {
    dragOffset,
    draggingBlockIds,
    handleDragStart,
    handleAllBlocksDragStart,
  };
}
