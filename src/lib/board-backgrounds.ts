import type { BoardSettings } from '@/types';

export const BOARD_GRADIENTS: Record<string, { label: string; css: string }> = {
  ocean:    { label: 'Ocean',    css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  sunset:   { label: 'Sunset',   css: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  forest:   { label: 'Forest',   css: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  midnight: { label: 'Midnight', css: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  dawn:     { label: 'Dawn',     css: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  arctic:   { label: 'Arctic',   css: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' },
  ember:    { label: 'Ember',    css: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)' },
  slate:    { label: 'Slate',    css: 'linear-gradient(135deg, #868f96 0%, #596164 100%)' },
  lagoon:   { label: 'Lagoon',   css: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  storm:    { label: 'Storm',    css: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  dusk:     { label: 'Dusk',     css: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  moss:     { label: 'Moss',     css: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' },
};

export function getBoardBackgroundStyle(
  settings: BoardSettings
): React.CSSProperties | undefined {
  if (settings.backgroundType === 'gradient' && settings.backgroundGradient) {
    const gradient = BOARD_GRADIENTS[settings.backgroundGradient];
    if (gradient) {
      return { background: gradient.css };
    }
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
