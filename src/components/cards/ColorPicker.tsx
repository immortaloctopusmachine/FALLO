'use client';

import { useState } from 'react';
import { Check, Palette, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  color: string | null;
  onChange: (color: string | null) => void;
}

const COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
];

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (selectedColor: string) => {
    onChange(selectedColor === color ? null : selectedColor);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={color ? 'outline' : 'ghost'}
          size="sm"
          className="w-full justify-start text-text-tertiary"
        >
          {color ? (
            <>
              <div
                className="mr-2 h-4 w-4 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span className="flex-1 text-left text-text-primary">
                {COLORS.find((c) => c.value === color)?.label || 'Custom'}
              </span>
              <button
                onClick={handleClear}
                className="ml-1 rounded p-0.5 hover:bg-surface-hover"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <>
              <Palette className="mr-2 h-4 w-4" />
              Set color
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
        <div className="grid grid-cols-4 gap-2">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => handleSelect(c.value)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md transition-transform hover:scale-110',
                color === c.value && 'ring-2 ring-offset-2 ring-text-primary'
              )}
              style={{ backgroundColor: c.value }}
              title={c.label}
            >
              {color === c.value && (
                <Check className="h-4 w-4 text-white" />
              )}
            </button>
          ))}
        </div>
        {color && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
          >
            Remove color
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
