'use client';

import { Eye, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditModeToggleProps {
  editMode: boolean;
  onToggle: (editMode: boolean) => void;
}

export function EditModeToggle({ editMode, onToggle }: EditModeToggleProps) {
  return (
    <button
      onClick={() => onToggle(!editMode)}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        editMode
          ? 'bg-orange-500 text-white hover:bg-orange-600'
          : 'bg-surface-hover text-muted-foreground hover:bg-surface-hover/80'
      )}
    >
      {editMode ? (
        <>
          <Eye className="h-3.5 w-3.5" />
          View Mode
        </>
      ) : (
        <>
          <Pencil className="h-3.5 w-3.5" />
          Edit Mode
        </>
      )}
    </button>
  );
}
