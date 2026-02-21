export const UI_THEMES = ['light', 'windows95', 'slate', 'sparkle', 'douala', 'colordore', 'pc98', 'retromarket'] as const;
export type UiTheme = (typeof UI_THEMES)[number];

export const SKIN_ICON_NAMES = [
  'nav-home',
  'nav-timeline',
  'nav-projects',
  'nav-boards',
  'nav-organization',
  'nav-teams',
  'nav-users',
  'nav-settings',
  'toggle-light',
  'toggle-windows95',
  'toggle-slate',
  'toggle-sparkle',
  'toggle-douala',
  'toggle-colordore',
  'toggle-pc98',
  'toggle-retromarket',
  'ornament-star',
  'ornament-heart',
  'ornament-moon',
] as const;

export type SkinIconName = (typeof SKIN_ICON_NAMES)[number];

export interface ThemeSkinAssets {
  logoEnabled: boolean;
  logoPath: string;
  backgroundEnabled: boolean;
  backgroundPath: string;
  backgroundOverlay: string;
  backgroundPosition: string;
  fontEnabled: boolean;
  fontFamily: string;
  headingFontEnabled: boolean;
  headingFontFamily: string;
  iconEnabled: Record<SkinIconName, boolean>;
  iconPath: Record<SkinIconName, string>;
}

export type SkinAssetsConfig = Record<UiTheme, ThemeSkinAssets>;

export const SKIN_ASSETS_EVENT = 'ui:skin-assets-changed';
export const SKIN_SETTINGS_SCOPE = 'global';
const SKIN_ASSETS_CACHE_KEY = 'ui.skin-assets.config.v1';

let inMemorySkinAssetsConfig: SkinAssetsConfig | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createDefaultIconEnabledMap(): Record<SkinIconName, boolean> {
  const map = {} as Record<SkinIconName, boolean>;
  for (const iconName of SKIN_ICON_NAMES) {
    map[iconName] = false;
  }
  return map;
}

function createDefaultIconPathMap(_theme: UiTheme): Record<SkinIconName, string> {
  const map = {} as Record<SkinIconName, string>;
  for (const iconName of SKIN_ICON_NAMES) {
    map[iconName] = '';
  }
  return map;
}

export function isSupportedAssetPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  if (trimmed.length > 512) return false;
  if (/["'`()<>]/.test(trimmed)) return false;
  if (/\s/.test(trimmed)) return false;

  if (trimmed.startsWith('/')) {
    return true;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function sanitizeAssetPath(path: unknown, fallback: string): string {
  if (typeof path !== 'string') return fallback;
  const trimmed = path.trim();
  if (!isSupportedAssetPath(trimmed)) return fallback;
  return trimmed;
}

function sanitizeBackgroundOverlay(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.length > 256) return fallback;
  return trimmed;
}

function sanitizeBackgroundPosition(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.length > 64) return fallback;
  return /^[a-zA-Z0-9%.,\- ]+$/.test(trimmed) ? trimmed : fallback;
}

function sanitizeFontFamily(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.length > 220) return fallback;
  return /^[a-zA-Z0-9,'" -]+$/.test(trimmed) ? trimmed : fallback;
}

export function getSkinIconPath(theme: UiTheme, iconName: SkinIconName): string {
  return `/skins/icons/${theme}/${iconName}.svg`;
}

export function getDefaultThemeLogoPath(theme: UiTheme): string {
  return `/skins/logos/${theme}.svg`;
}

export function getDefaultThemeBackgroundPath(theme: UiTheme): string {
  return `/skins/backgrounds/${theme}/background.jpg`;
}

export function createDefaultThemeSkinAssets(theme: UiTheme): ThemeSkinAssets {
  return {
    logoEnabled: false,
    logoPath: '',
    backgroundEnabled: false,
    backgroundPath: '',
    backgroundOverlay: 'transparent',
    backgroundPosition: 'center',
    fontEnabled: false,
    fontFamily: '',
    headingFontEnabled: false,
    headingFontFamily: '',
    iconEnabled: createDefaultIconEnabledMap(),
    iconPath: createDefaultIconPathMap(theme),
  };
}

export function createDefaultSkinAssetsConfig(): SkinAssetsConfig {
  return {
    light: createDefaultThemeSkinAssets('light'),
    windows95: createDefaultThemeSkinAssets('windows95'),
    slate: createDefaultThemeSkinAssets('slate'),
    sparkle: createDefaultThemeSkinAssets('sparkle'),
    douala: createDefaultThemeSkinAssets('douala'),
    colordore: createDefaultThemeSkinAssets('colordore'),
    pc98: createDefaultThemeSkinAssets('pc98'),
    retromarket: createDefaultThemeSkinAssets('retromarket'),
  };
}

function normalizeThemeSkinAssets(theme: UiTheme, value: unknown): ThemeSkinAssets {
  const defaults = createDefaultThemeSkinAssets(theme);
  if (!isRecord(value)) return defaults;

  const iconEnabled = { ...defaults.iconEnabled };
  const iconPath = { ...defaults.iconPath };
  const rawIconEnabled = value.iconEnabled;
  if (isRecord(rawIconEnabled)) {
    for (const iconName of SKIN_ICON_NAMES) {
      const legacyIconName = iconName === 'toggle-colordore' ? 'toggle-commodore' : null;
      const rawFlag = rawIconEnabled[iconName];
      const legacyFlag = legacyIconName ? rawIconEnabled[legacyIconName] : undefined;
      const resolvedFlag = typeof rawFlag === 'boolean' ? rawFlag : legacyFlag;

      if (typeof resolvedFlag === 'boolean') {
        iconEnabled[iconName] = resolvedFlag;
      }
    }
  }

  const rawIconPath = value.iconPath;
  if (isRecord(rawIconPath)) {
    for (const iconName of SKIN_ICON_NAMES) {
      const legacyIconName = iconName === 'toggle-colordore' ? 'toggle-commodore' : null;
      const rawPath = rawIconPath[iconName];
      const legacyPath = legacyIconName ? rawIconPath[legacyIconName] : undefined;
      const resolvedPath = typeof rawPath === 'string' ? rawPath : legacyPath;

      iconPath[iconName] = sanitizeAssetPath(resolvedPath, defaults.iconPath[iconName]);
    }
  }

  return {
    logoEnabled: typeof value.logoEnabled === 'boolean' ? value.logoEnabled : defaults.logoEnabled,
    logoPath: sanitizeAssetPath(value.logoPath, defaults.logoPath),
    backgroundEnabled:
      typeof value.backgroundEnabled === 'boolean' ? value.backgroundEnabled : defaults.backgroundEnabled,
    backgroundPath: sanitizeAssetPath(value.backgroundPath, defaults.backgroundPath),
    backgroundOverlay: sanitizeBackgroundOverlay(value.backgroundOverlay, defaults.backgroundOverlay),
    backgroundPosition: sanitizeBackgroundPosition(value.backgroundPosition, defaults.backgroundPosition),
    fontEnabled: typeof value.fontEnabled === 'boolean' ? value.fontEnabled : defaults.fontEnabled,
    fontFamily: sanitizeFontFamily(value.fontFamily, defaults.fontFamily),
    headingFontEnabled:
      typeof value.headingFontEnabled === 'boolean' ? value.headingFontEnabled : defaults.headingFontEnabled,
    headingFontFamily: sanitizeFontFamily(value.headingFontFamily, defaults.headingFontFamily),
    iconEnabled,
    iconPath,
  };
}

export function normalizeSkinAssetsConfig(value: unknown): SkinAssetsConfig {
  const defaults = createDefaultSkinAssetsConfig();
  if (!isRecord(value)) return defaults;

  return {
    light: normalizeThemeSkinAssets('light', value.light),
    windows95: normalizeThemeSkinAssets('windows95', value.windows95),
    slate: normalizeThemeSkinAssets('slate', value.slate),
    sparkle: normalizeThemeSkinAssets('sparkle', value.sparkle),
    douala: normalizeThemeSkinAssets('douala', value.douala),
    colordore: normalizeThemeSkinAssets('colordore', value.colordore ?? value.commodore),
    pc98: normalizeThemeSkinAssets('pc98', value.pc98),
    retromarket: normalizeThemeSkinAssets('retromarket', value.retromarket),
  };
}

export function getCachedSkinAssetsConfig(): SkinAssetsConfig | null {
  if (inMemorySkinAssetsConfig) {
    return inMemorySkinAssetsConfig;
  }

  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(SKIN_ASSETS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const normalized = normalizeSkinAssetsConfig(parsed);
    inMemorySkinAssetsConfig = normalized;
    return normalized;
  } catch {
    return null;
  }
}

export function cacheSkinAssetsConfig(config: SkinAssetsConfig): SkinAssetsConfig {
  const normalized = normalizeSkinAssetsConfig(config);
  inMemorySkinAssetsConfig = normalized;

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SKIN_ASSETS_CACHE_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore localStorage write failures.
    }
  }

  return normalized;
}

export function broadcastSkinAssetsConfigChanged(config: SkinAssetsConfig): void {
  if (typeof window === 'undefined') return;
  const normalized = cacheSkinAssetsConfig(config);
  window.dispatchEvent(new CustomEvent(SKIN_ASSETS_EVENT, { detail: normalized }));
}

export function subscribeToSkinAssetsConfig(
  onChange: (config: SkinAssetsConfig) => void
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleLocalChange = (event: Event) => {
    const customEvent = event as CustomEvent<SkinAssetsConfig | undefined>;
    if (customEvent.detail) {
      onChange(customEvent.detail);
    }
  };

  window.addEventListener(SKIN_ASSETS_EVENT, handleLocalChange);

  return () => {
    window.removeEventListener(SKIN_ASSETS_EVENT, handleLocalChange);
  };
}

function toCssUrl(path: string): string {
  const trimmed = path.trim();
  return trimmed ? `url("${trimmed}")` : 'none';
}

const GOOGLE_FONTS_MAP: Record<string, string> = {
  'Bebas Neue': 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
  'Anton': 'https://fonts.googleapis.com/css2?family=Anton&display=swap',
  'Oswald': 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap',
  'Teko': 'https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600;700&display=swap',
  'Barlow Condensed': 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800&display=swap',
  'Baloo 2': 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700&display=swap',
  Fredoka: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap',
  Quicksand: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap',
  'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'Roboto': 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'Montserrat': 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap',
  'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'Open Sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
  'Lato': 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap',
  'Nunito': 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap',
  'Source Sans 3': 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap',
  'Rubik': 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap',
  'Ubuntu': 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap',
  'IBM Plex Sans': 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
  'Fira Sans': 'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600;700&display=swap',
  'Luckiest Guy': 'https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap',
  Bangers: 'https://fonts.googleapis.com/css2?family=Bangers&display=swap',
  'Press Start 2P': 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
  Silkscreen: 'https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap',
  VT323: 'https://fonts.googleapis.com/css2?family=VT323&display=swap',
  Righteous: 'https://fonts.googleapis.com/css2?family=Righteous&display=swap',
  'Archivo Black': 'https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap',
  'Merriweather': 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap',
  'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&display=swap',
};

function ensureGoogleFontLoaded(fontFamilyValue: string): void {
  if (typeof document === 'undefined') return;
  const match = fontFamilyValue.match(/^"?([^",]+)"?/);
  if (!match) return;
  const fontName = match[1].trim();
  const url = GOOGLE_FONTS_MAP[fontName];
  if (!url) return;

  const linkId = `skin-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

export function applyThemeSkinCssVariables(theme: UiTheme, assets: ThemeSkinAssets): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (assets.backgroundEnabled && assets.backgroundPath.trim()) {
    root.classList.add('skin-bg-active');
    root.style.setProperty('--skin-bg-display', 'block');
    root.style.setProperty('--skin-bg', toCssUrl(assets.backgroundPath));
    root.style.setProperty('--skin-bg-overlay', assets.backgroundOverlay.trim() || 'transparent');
    root.style.setProperty('--skin-bg-pos', assets.backgroundPosition.trim() || 'center');
    root.style.setProperty('--skin-bg-page-color', 'transparent');
  } else {
    root.classList.remove('skin-bg-active');
    root.style.setProperty('--skin-bg-display', 'none');
    root.style.setProperty('--skin-bg', 'none');
    root.style.setProperty('--skin-bg-overlay', 'transparent');
    root.style.setProperty('--skin-bg-pos', 'center');
    root.style.removeProperty('--skin-bg-page-color');
  }

  if (assets.fontEnabled && assets.fontFamily.trim()) {
    root.style.setProperty('--skin-font-family', assets.fontFamily.trim());
    ensureGoogleFontLoaded(assets.fontFamily.trim());
  } else {
    root.style.removeProperty('--skin-font-family');
  }

  if (assets.headingFontEnabled && assets.headingFontFamily.trim()) {
    root.style.setProperty('--skin-font-heading', assets.headingFontFamily.trim());
    ensureGoogleFontLoaded(assets.headingFontFamily.trim());
  } else {
    root.style.removeProperty('--skin-font-heading');
  }

  const ornamentVars: Array<{ iconName: SkinIconName; cssVar: string }> = [
    { iconName: 'ornament-heart', cssVar: '--sparkle-heart' },
    { iconName: 'ornament-star', cssVar: '--sparkle-star' },
    { iconName: 'ornament-moon', cssVar: '--sparkle-moon' },
  ];

  for (const { iconName, cssVar } of ornamentVars) {
    const configuredPath = sanitizeAssetPath(assets.iconPath[iconName], '');
    if (assets.iconEnabled[iconName] && configuredPath) {
      root.style.setProperty(cssVar, toCssUrl(configuredPath));
    } else {
      root.style.removeProperty(cssVar);
    }
  }
}

export function getConfiguredSkinIconPath(
  _theme: UiTheme,
  assets: ThemeSkinAssets,
  iconName: SkinIconName
): string {
  return sanitizeAssetPath(assets.iconPath[iconName], '');
}
