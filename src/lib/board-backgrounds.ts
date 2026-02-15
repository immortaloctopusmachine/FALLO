import type { BoardSettings } from '@/types';

export const BOARD_GRADIENTS: Record<string, { label: string; css: string }> = {
  purple: { label: 'Purple', css: 'var(--board-gradient-purple)' },
  yellow: { label: 'Yellow', css: 'var(--board-gradient-yellow)' },
  blue: { label: 'Blue', css: 'var(--board-gradient-blue)' },
  green: { label: 'Green', css: 'var(--board-gradient-green)' },
  pink: { label: 'Pink', css: 'var(--board-gradient-pink)' },
  teal: { label: 'Teal', css: 'var(--board-gradient-teal)' },
  red: { label: 'Red', css: 'var(--board-gradient-red)' },
};

export function getBoardBackgroundStyle(
  settings: BoardSettings
): React.CSSProperties | undefined {
  if (settings.backgroundType === 'gradient' && settings.backgroundGradient) {
    const gradient = BOARD_GRADIENTS[settings.backgroundGradient];
    return { background: gradient?.css || 'var(--board-gradient-purple)' };
  }

  if (settings.backgroundType === 'image' && settings.backgroundImageUrl) {
    return {
      backgroundImage: `url(${settings.backgroundImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  return undefined;
}
