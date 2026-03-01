'use client';

import { cn } from '@/lib/utils';
import type { AcademyCategory } from '@/types/academy';

interface CategoryFilterProps {
  categories: AcademyCategory[];
  selected: string | undefined;
  onSelect: (categoryId: string | undefined) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(undefined)}
        className={cn(
          'rounded-full px-3 py-1 text-xs font-medium transition-colors',
          !selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-surface-hover text-muted-foreground hover:bg-surface-hover/80'
        )}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            selected === category.id
              ? 'text-white'
              : 'bg-surface-hover text-muted-foreground hover:bg-surface-hover/80'
          )}
          style={
            selected === category.id && category.color
              ? { backgroundColor: category.color }
              : selected === category.id
                ? { backgroundColor: 'var(--primary)' }
                : undefined
          }
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
