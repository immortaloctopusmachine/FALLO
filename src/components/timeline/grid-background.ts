import type { CSSProperties } from 'react';

const DEFAULT_DAYS_PER_WEEK = 5;

export function getTimelineGridBackground(
  columnWidth: number,
  daysPerWeek: number = DEFAULT_DAYS_PER_WEEK
): CSSProperties {
  const weekWidth = columnWidth * daysPerWeek;

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
}
