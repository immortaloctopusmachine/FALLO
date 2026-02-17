import type { BoardSettings } from '@/types';

/**
 * Returns the display name for a project.
 * Uses productionTitle from settings when available, otherwise falls back to board.name (working title).
 */
export function getProjectDisplayName(
  boardName: string,
  settings: BoardSettings | null | undefined,
): string {
  return settings?.productionTitle?.trim() || boardName;
}
