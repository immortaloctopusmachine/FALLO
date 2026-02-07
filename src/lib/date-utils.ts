/**
 * Consolidated date utilities for business day calculations and week snapping.
 *
 * This module eliminates duplicated date functions that previously existed in:
 * - src/lib/list-templates.ts
 * - src/components/timeline/TimelineView.tsx
 * - src/app/api/boards/[boardId]/timeline/blocks/route.ts
 * - src/app/api/boards/[boardId]/timeline/blocks/[blockId]/route.ts
 * - src/app/api/boards/[boardId]/timeline/blocks/[blockId]/delete-and-shift/route.ts
 * - src/app/api/boards/[boardId]/timeline/blocks/insert/route.ts
 * - src/app/api/boards/[boardId]/timeline/blocks/move-group/route.ts
 */

/**
 * Get the Monday of the week for a given date.
 * - If the date is Sunday, returns the previous Monday (6 days back)
 * - If the date is any other day, returns that week's Monday
 *
 * @param date - The input date
 * @returns A new Date set to Monday of that week
 */
export function getMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  // If Sunday (0), go back 6 days; otherwise go back (day - 1) days
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

/**
 * Snap a date to the nearest Monday for block alignment.
 * - If Sunday, moves to next Monday
 * - If Saturday, moves to next Monday
 * - Otherwise, moves to previous Monday (or stays if already Monday)
 *
 * This differs from getMonday() in Saturday/Sunday handling:
 * - getMonday(): Sunday -> previous Monday
 * - snapToMonday(): Sunday -> next Monday
 *
 * Use getMonday() for finding the week a date belongs to.
 * Use snapToMonday() for snapping a target date to a valid block start.
 *
 * @param date - The input date
 * @returns A new Date set to the snapped Monday
 */
export function snapToMonday(date: Date): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();

  // If Sunday, move to next Monday
  if (dayOfWeek === 0) {
    result.setDate(result.getDate() + 1);
  }
  // If Saturday, move to next Monday
  else if (dayOfWeek === 6) {
    result.setDate(result.getDate() + 2);
  }
  // Otherwise, move to previous Monday (if not already Monday)
  else if (dayOfWeek !== 1) {
    result.setDate(result.getDate() - (dayOfWeek - 1));
  }

  return result;
}

/**
 * Get the Friday of a week given a Monday.
 *
 * @param monday - A Monday date
 * @returns A new Date set to Friday of that week (Monday + 4 days)
 */
export function getFriday(monday: Date): Date {
  const result = new Date(monday);
  result.setDate(result.getDate() + 4);
  return result;
}

/**
 * Get the end date for a 5-day block starting on a Monday.
 * Alias for getFriday() with clearer intent.
 *
 * @param startDate - The Monday start date
 * @returns A new Date set to Friday of that week
 */
export function getBlockEndDate(startDate: Date): Date {
  return getFriday(startDate);
}

/**
 * Add or subtract business days from a date (skipping weekends).
 *
 * @param date - The starting date
 * @param days - Number of business days to add (negative to subtract)
 * @returns A new Date after adding/subtracting business days
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let remainingDays = Math.abs(days);
  const direction = days >= 0 ? 1 : -1;

  while (remainingDays > 0) {
    result.setDate(result.getDate() + direction);
    const dayOfWeek = result.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remainingDays--;
    }
  }

  return result;
}

/**
 * Count the number of business days between two dates (inclusive).
 *
 * @param start - The start date
 * @param end - The end date
 * @returns Number of business days between start and end (inclusive)
 */
export function getBusinessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Move a block's dates by weeks, snapping to Mon-Fri 5-day blocks.
 *
 * @param startDate - The current block start date
 * @param weeksDelta - Number of weeks to move (positive = forward, negative = backward)
 * @returns Object with newStartDate (Monday) and newEndDate (Friday)
 */
export function moveBlockDates(
  startDate: Date,
  weeksDelta: number
): { newStartDate: Date; newEndDate: Date } {
  // Get the Monday of the current week the block starts in
  const currentMonday = getMonday(startDate);

  // Move by the specified number of weeks (7 calendar days per week)
  const newMonday = new Date(currentMonday);
  newMonday.setDate(newMonday.getDate() + weeksDelta * 7);

  // End date is always Friday (5-day block: Mon-Fri)
  const newFriday = getFriday(newMonday);

  return { newStartDate: newMonday, newEndDate: newFriday };
}

/**
 * Move a block by weeks, returning the new start date snapped to Monday.
 * Simplified version of moveBlockDates that only returns the start date.
 *
 * @param startDate - The current block start date
 * @param weeks - Number of weeks to move
 * @returns A new Date set to the Monday of the target week
 */
export function moveBlockByWeeks(startDate: Date, weeks: number): Date {
  const result = new Date(startDate);
  result.setDate(result.getDate() + weeks * 7);
  return snapToMonday(result);
}

/**
 * Format a date range for display.
 *
 * @param startDate - The start date (Date or string)
 * @param endDate - The end date (Date or string)
 * @param options - Optional configuration
 * @param options.includeYear - Force include year even if current year
 * @returns Formatted string like "Jan 1 - Jan 5" or "Jan 1 - Jan 5, 2025"
 */
export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string,
  options?: { includeYear?: boolean }
): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  const startStr = start.toLocaleDateString('en-US', formatOptions);
  const endStr = end.toLocaleDateString('en-US', formatOptions);

  // Include year if different from current year or explicitly requested
  const currentYear = new Date().getFullYear();
  if (options?.includeYear || start.getFullYear() !== currentYear || end.getFullYear() !== currentYear) {
    return `${startStr} - ${endStr}, ${end.getFullYear()}`;
  }

  return `${startStr} - ${endStr}`;
}

/**
 * Format a month/year for timeline header display.
 *
 * @param date - The date to format
 * @returns Formatted string like "January 2026"
 */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
