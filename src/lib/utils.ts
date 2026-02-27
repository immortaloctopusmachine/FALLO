import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Fibonacci story point values.
 */
export const STORY_POINT_VALUES = [1, 2, 3, 5, 8, 13, 21] as const;
