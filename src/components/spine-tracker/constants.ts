import type { SkeletonGroup } from '@/types/spine-tracker';

// ============== STATUS OPTIONS ==============

export const SKELETON_STATUSES = [
  'planned',
  'ready_to_be_implemented',
  'implemented',
  'not_as_intended',
] as const;
export const ANIMATION_STATUSES = [
  'planned',
  'ready_to_be_implemented',
  'implemented',
  'not_as_intended',
] as const;
export const SOUND_FX_TRIGGERS = ['spine_event', 'code_trigger', 'timeline'] as const;

// ============== STATUS COLORS ==============

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  planned: { bg: 'bg-slate-700', text: 'text-slate-100' },
  ready_to_be_implemented: { bg: 'bg-yellow-600', text: 'text-yellow-100' },
  implemented: { bg: 'bg-emerald-600', text: 'text-emerald-100' },
  not_as_intended: { bg: 'bg-red-600', text: 'text-red-100' },
};

// ============== SKELETON GROUPS ==============

export const DEFAULT_SKELETON_GROUPS: SkeletonGroup[] = [
  { id: 'symbols', label: 'Symbols', icon: 'S' },
  { id: 'ui', label: 'UI Elements', icon: 'UI' },
  { id: 'characters', label: 'Characters', icon: 'C' },
  { id: 'screens', label: 'Screens', icon: 'SC' },
  { id: 'layout', label: 'Layout', icon: 'L' },
  { id: 'other', label: 'Other', icon: 'O' },
];

export const PROTECTED_GROUPS = ['other'];

// ============== LAYOUT TEMPLATE BONES ==============

export const LAYOUT_TEMPLATE_BONES = [
  { bone: 'BACKGROUND_CHARACTER', purpose: 'Background character placement' },
  { bone: 'CLICK_ANYWHERE', purpose: 'Transition screen button' },
  { bone: 'CLICK_ANYWHERE_STARTSCREEN', purpose: 'Start screen button placement' },
  { bone: 'FEATURE_BUY_BUTTON', purpose: 'Buy feature button (optional)' },
  { bone: 'FREE_SPINS_MULTIPLIER', purpose: 'Free spins multiplier display' },
  { bone: 'FREE_SPINS_REMAINING_SPINS', purpose: 'Spins remaining counter' },
  { bone: 'FREE_SPINS_TOTAL_WIN', purpose: 'Accumulated win display' },
  { bone: 'GAME_LOGO', purpose: 'Logo in base game' },
  { bone: 'GAME_LOGO_FREESPINS', purpose: 'Logo in free spins mode' },
  { bone: 'GAME_LOGO_TEXT', purpose: 'Text version of logo' },
  { bone: 'HUD_BOTTOM', purpose: 'Bottom HUD area' },
  { bone: 'HUD_TOP', purpose: 'Top HUD area' },
  { bone: 'MENU_BUTTON', purpose: 'Menu button placement' },
  { bone: 'MENU_LOGO', purpose: 'Logo in menu popup' },
  { bone: 'PARTICLE_COIN_EMITTER', purpose: 'Big win coin particles' },
  { bone: 'PARTICLE_COIN_EMITTER_LOW_WIN', purpose: 'Small/medium win particles' },
  { bone: 'REEL', purpose: 'Reel background and frame (top-left)' },
  { bone: 'SPIN_BUTTON', purpose: 'Main spin button' },
  { bone: 'SPIN_BUTTON/AUTOPLAY_BUTTON', purpose: 'Autoplay button' },
  { bone: 'SPIN_BUTTON/BET_BUTTON', purpose: 'Bet button' },
  { bone: 'SPIN_BUTTON/QUICK_PLAY_BUTTON', purpose: 'Quick play button' },
  { bone: 'WIN_POSITION', purpose: 'Win animation placement' },
];

// ============== Z-ORDER RANGES ==============

export const Z_ORDER_RANGES = [
  { range: '0-99', layer: 'Background', examples: 'Layout template, backgrounds' },
  { range: '100-199', layer: 'Reels and Symbols', examples: 'Reel frame, symbols' },
  { range: '200-299', layer: 'Characters', examples: 'Main character, aliens' },
  { range: '300-399', layer: 'UI - Bottom', examples: 'HUD bottom, bet controls' },
  { range: '400-499', layer: 'UI - Top', examples: 'HUD top, balance display' },
  { range: '500-599', layer: 'Overlays', examples: 'Win displays, multipliers' },
  { range: '600-699', layer: 'Particles', examples: 'Particles, celebrations' },
  { range: '700-799', layer: 'Popups', examples: 'Menus, dialogs' },
  { range: '800-899', layer: 'Transitions', examples: 'Screen wipes, fades' },
  { range: '900-999', layer: 'System', examples: 'Loading, critical alerts' },
];

// ============== Z-ORDER BADGE COLORS ==============

export function getZOrderColor(zOrder: number): string {
  if (zOrder < 100) return 'bg-slate-600';
  if (zOrder < 200) return 'bg-violet-600';
  if (zOrder < 300) return 'bg-indigo-600';
  if (zOrder < 400) return 'bg-sky-600';
  if (zOrder < 500) return 'bg-cyan-600';
  if (zOrder < 600) return 'bg-teal-600';
  if (zOrder < 700) return 'bg-amber-600';
  if (zOrder < 800) return 'bg-orange-600';
  return 'bg-rose-600';
}
