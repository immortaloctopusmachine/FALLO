import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

/**
 * Generate initials from name
 */
export function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Calculate completion percentage
 */
export function calculateCompletion(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Fibonacci story point values
 */
export const STORY_POINT_VALUES = [1, 2, 3, 5, 8, 13, 21] as const;
export type StoryPointValue = (typeof STORY_POINT_VALUES)[number];

/**
 * Card type display info
 */
export const CARD_TYPE_INFO = {
  TASK: {
    label: 'Task',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    icon: 'CheckSquare',
  },
  USER_STORY: {
    label: 'User Story',
    color: '#22C55E',
    bgColor: '#F0FDF4',
    icon: 'BookOpen',
  },
  EPIC: {
    label: 'Epic',
    color: '#A855F7',
    bgColor: '#FAF5FF',
    icon: 'Layers',
  },
  UTILITY: {
    label: 'Utility',
    color: '#6B7280',
    bgColor: '#F9FAFB',
    icon: 'FileText',
  },
} as const;

/**
 * User story flag display info
 */
export const FLAG_INFO = {
  COMPLEX: { label: 'Complex', icon: '🔶', color: '#F59E0B' },
  HIGH_RISK: { label: 'High Risk', icon: '🔴', color: '#EF4444' },
  MISSING_DOCS: { label: 'Missing Docs', icon: '📄', color: '#6B7280' },
  BLOCKED: { label: 'Blocked', icon: '🚫', color: '#EF4444' },
  NEEDS_REVIEW: { label: 'Needs Review', icon: '👁️', color: '#3B82F6' },
} as const;

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Generate a unique ID (for optimistic updates)
 */
export function generateId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
