import { describe, it, expect, beforeEach } from 'vitest';
import { getContrastColor, clearContrastColorCache } from '../color-utils';

describe('color-utils', () => {
  describe('getContrastColor', () => {
    beforeEach(() => {
      clearContrastColorCache();
    });

    it('returns black for white background', () => {
      expect(getContrastColor('#ffffff')).toBe('#000000');
      expect(getContrastColor('#FFFFFF')).toBe('#000000');
    });

    it('returns white for black background', () => {
      expect(getContrastColor('#000000')).toBe('#ffffff');
    });

    it('returns black for light colors', () => {
      // Yellow - very light
      expect(getContrastColor('#ffff00')).toBe('#000000');
      // Light gray
      expect(getContrastColor('#cccccc')).toBe('#000000');
      // Light pink
      expect(getContrastColor('#ffcccc')).toBe('#000000');
    });

    it('returns white for dark colors', () => {
      // Dark blue
      expect(getContrastColor('#000080')).toBe('#ffffff');
      // Dark green
      expect(getContrastColor('#006400')).toBe('#ffffff');
      // Dark red
      expect(getContrastColor('#8b0000')).toBe('#ffffff');
    });

    it('handles colors without # prefix', () => {
      expect(getContrastColor('ffffff')).toBe('#000000');
      expect(getContrastColor('000000')).toBe('#ffffff');
    });

    it('handles mid-tone colors based on luminance', () => {
      // Pure red (luminance ~0.299) - should be white
      expect(getContrastColor('#ff0000')).toBe('#ffffff');
      // Pure green (luminance ~0.587) - should be black
      expect(getContrastColor('#00ff00')).toBe('#000000');
      // Pure blue (luminance ~0.114) - should be white
      expect(getContrastColor('#0000ff')).toBe('#ffffff');
    });

    it('caches results for repeated calls', () => {
      const color = '#3b82f6';

      // First call
      const result1 = getContrastColor(color);
      // Second call should return cached result
      const result2 = getContrastColor(color);

      expect(result1).toBe(result2);
    });

    it('handles common UI colors correctly', () => {
      // Tailwind-like colors from the app
      // Note: These are based on actual luminance calculations
      expect(getContrastColor('#6B7280')).toBe('#ffffff'); // Gray-500 (dark enough)
      expect(getContrastColor('#EC4899')).toBe('#000000'); // Pink-500 (light enough)
      expect(getContrastColor('#A855F7')).toBe('#000000'); // Purple-500 (luminance ~0.52)
      expect(getContrastColor('#22C55E')).toBe('#000000'); // Green-500
      expect(getContrastColor('#F97316')).toBe('#000000'); // Orange-500
      expect(getContrastColor('#10B981')).toBe('#000000'); // Emerald-500
    });
  });

  describe('clearContrastColorCache', () => {
    it('clears the cache', () => {
      // Populate cache
      getContrastColor('#ffffff');

      // Clear
      clearContrastColorCache();

      // This should work without errors (would fail if cache state was corrupted)
      expect(getContrastColor('#ffffff')).toBe('#000000');
    });
  });
});
