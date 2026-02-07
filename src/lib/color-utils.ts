/**
 * Consolidated color utilities.
 *
 * This module eliminates duplicated color functions that previously existed in:
 * - src/components/timeline/TimelineBlock.tsx
 * - src/components/timeline/TimelineEvent.tsx
 */

// Cache for contrast color calculations to avoid repeated computation
const contrastColorCache = new Map<string, string>();

/**
 * Get a contrasting text color (black or white) for a given background color.
 * Uses luminance calculation to determine readability.
 * Results are cached for performance.
 *
 * @param hexColor - The background color in hex format (with or without #)
 * @returns '#000000' for light backgrounds, '#ffffff' for dark backgrounds
 */
export function getContrastColor(hexColor: string): string {
  // Check cache first
  if (contrastColorCache.has(hexColor)) {
    return contrastColorCache.get(hexColor)!;
  }

  // Parse hex color
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate relative luminance using sRGB coefficients
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Choose black for light backgrounds, white for dark backgrounds
  const result = luminance > 0.5 ? '#000000' : '#ffffff';

  // Cache the result
  contrastColorCache.set(hexColor, result);

  return result;
}

/**
 * Clear the contrast color cache.
 * Useful for testing or when color values might change.
 */
export function clearContrastColorCache(): void {
  contrastColorCache.clear();
}
