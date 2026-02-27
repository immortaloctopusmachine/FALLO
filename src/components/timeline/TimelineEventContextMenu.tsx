'use client';

import type { TimelineEvent as TimelineEventType } from '@/types';

export interface TimelineEventContextMenuState {
  event: TimelineEventType;
  x: number;
  y: number;
}

interface TimelineEventContextMenuProps {
  menu: TimelineEventContextMenuState | null;
  onEdit?: (event: TimelineEventType) => void;
  onDelete?: (event: TimelineEventType) => void;
  onClose: () => void;
}

export function TimelineEventContextMenu({
  menu,
  onEdit,
  onDelete,
  onClose,
}: TimelineEventContextMenuProps) {
  if (!menu) {
    return null;
  }

  return (
    <div
      className="fixed bg-surface border border-border rounded-md shadow-lg py-1 z-50"
      style={{ left: menu.x, top: menu.y }}
    >
      <button
        className="w-full px-3 py-1.5 text-left text-body hover:bg-surface-hover"
        onClick={() => {
          onEdit?.(menu.event);
          onClose();
        }}
      >
        Edit Event
      </button>
      <hr className="my-1 border-border" />
      <button
        className="w-full px-3 py-1.5 text-left text-body text-error hover:bg-surface-hover"
        onClick={() => {
          onDelete?.(menu.event);
          onClose();
        }}
      >
        Delete Event
      </button>
    </div>
  );
}
