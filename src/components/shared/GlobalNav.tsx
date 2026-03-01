'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  FolderKanban,
  LayoutGrid,
  Building2,
  Users,
  User,
  GraduationCap,
  Settings,
  Palette,
  Sun,
  Sparkles,
  Flame,
  Monitor,
  Gamepad2,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  applyThemeSkinCssVariables,
  cacheSkinAssetsConfig,
  createDefaultSkinAssetsConfig,
  createDefaultThemeSkinAssets,
  getCachedSkinAssetsConfig,
  getConfiguredSkinIconPath,
  isSupportedAssetPath,
  normalizeSkinAssetsConfig,
  subscribeToSkinAssetsConfig,
  UI_THEMES,
  type SkinAssetsConfig,
  type SkinIconName,
  type UiTheme,
} from '@/lib/skin-assets';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from './NotificationBell';
import { ThemeIcon } from './ThemeIcon';
import { usePrefetchRoute } from '@/hooks/usePrefetchRoute';

interface GlobalNavProps {
  userName?: string | null;
  userEmail?: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  iconName: SkinIconName;
  slateAccent: {
    fill: string;
    fillStrong: string;
    solid: string;
    solidDeep: string;
    border: string;
    borderStrong: string;
    icon: string;
  };
}

const navItems: NavItem[] = [
  {
    href: '/home',
    label: 'Home',
    icon: Home,
    iconName: 'nav-home',
    slateAccent: {
      fill: 'rgba(90, 151, 248, 0.14)',
      fillStrong: 'rgba(90, 151, 248, 0.22)',
      solid: '#4674D7',
      solidDeep: '#2D53A8',
      border: 'rgba(90, 151, 248, 0.3)',
      borderStrong: 'rgba(144, 190, 255, 0.55)',
      icon: '#9BC4FF',
    },
  },
  {
    href: '/timeline',
    label: 'Timeline',
    icon: Calendar,
    iconName: 'nav-timeline',
    slateAccent: {
      fill: 'rgba(59, 211, 215, 0.14)',
      fillStrong: 'rgba(59, 211, 215, 0.22)',
      solid: '#2AAAB0',
      solidDeep: '#1E7E83',
      border: 'rgba(59, 211, 215, 0.3)',
      borderStrong: 'rgba(146, 238, 240, 0.5)',
      icon: '#8BECEE',
    },
  },
  {
    href: '/projects',
    label: 'Projects',
    icon: FolderKanban,
    iconName: 'nav-projects',
    slateAccent: {
      fill: 'rgba(91, 214, 140, 0.14)',
      fillStrong: 'rgba(91, 214, 140, 0.22)',
      solid: '#3FAE6D',
      solidDeep: '#2B7B4C',
      border: 'rgba(91, 214, 140, 0.3)',
      borderStrong: 'rgba(156, 242, 191, 0.5)',
      icon: '#A4F1BD',
    },
  },
  {
    href: '/boards',
    label: 'Boards',
    icon: LayoutGrid,
    iconName: 'nav-boards',
    slateAccent: {
      fill: 'rgba(244, 186, 82, 0.14)',
      fillStrong: 'rgba(244, 186, 82, 0.22)',
      solid: '#D39A3D',
      solidDeep: '#986A1F',
      border: 'rgba(244, 186, 82, 0.3)',
      borderStrong: 'rgba(255, 219, 150, 0.5)',
      icon: '#FFD58F',
    },
  },
  {
    href: '/organization',
    label: 'Organization',
    icon: Building2,
    iconName: 'nav-organization',
    slateAccent: {
      fill: 'rgba(242, 92, 132, 0.14)',
      fillStrong: 'rgba(242, 92, 132, 0.22)',
      solid: '#D25278',
      solidDeep: '#9A3151',
      border: 'rgba(242, 92, 132, 0.3)',
      borderStrong: 'rgba(255, 171, 194, 0.5)',
      icon: '#FFABC2',
    },
  },
  {
    href: '/teams',
    label: 'Teams',
    icon: Users,
    iconName: 'nav-teams',
    slateAccent: {
      fill: 'rgba(166, 118, 255, 0.14)',
      fillStrong: 'rgba(166, 118, 255, 0.22)',
      solid: '#8A63E1',
      solidDeep: '#623FAD',
      border: 'rgba(166, 118, 255, 0.3)',
      borderStrong: 'rgba(212, 184, 255, 0.5)',
      icon: '#D2B8FF',
    },
  },
  {
    href: '/users',
    label: 'Users',
    icon: User,
    iconName: 'nav-users',
    slateAccent: {
      fill: 'rgba(114, 167, 255, 0.14)',
      fillStrong: 'rgba(114, 167, 255, 0.22)',
      solid: '#5689D9',
      solidDeep: '#375FAA',
      border: 'rgba(114, 167, 255, 0.3)',
      borderStrong: 'rgba(180, 212, 255, 0.5)',
      icon: '#B4D4FF',
    },
  },
  {
    href: '/academy',
    label: 'Academy',
    icon: GraduationCap,
    iconName: 'nav-academy',
    slateAccent: {
      fill: 'rgba(55, 211, 164, 0.14)',
      fillStrong: 'rgba(55, 211, 164, 0.22)',
      solid: '#2CA386',
      solidDeep: '#1E7560',
      border: 'rgba(55, 211, 164, 0.3)',
      borderStrong: 'rgba(154, 244, 220, 0.5)',
      icon: '#9AF4DC',
    },
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    iconName: 'nav-settings',
    slateAccent: {
      fill: 'rgba(154, 150, 166, 0.16)',
      fillStrong: 'rgba(154, 150, 166, 0.24)',
      solid: '#797489',
      solidDeep: '#575363',
      border: 'rgba(154, 150, 166, 0.3)',
      borderStrong: 'rgba(210, 206, 223, 0.44)',
      icon: '#C7C3D4',
    },
  },
];

const themeToggleIcons: Record<UiTheme, { iconName: SkinIconName; fallback: LucideIcon }> = {
  light: { iconName: 'toggle-light', fallback: Sun },
  windows95: { iconName: 'toggle-windows95', fallback: Monitor },
  slate: { iconName: 'toggle-slate', fallback: Palette },
  sparkle: { iconName: 'toggle-sparkle', fallback: Sparkles },
  douala: { iconName: 'toggle-douala', fallback: Flame },
  anime90s: { iconName: 'toggle-anime90s', fallback: Flame },
  colordore: { iconName: 'toggle-colordore', fallback: Monitor },
  pc98: { iconName: 'toggle-pc98', fallback: Gamepad2 },
  retromarket: { iconName: 'toggle-retromarket', fallback: BarChart3 },
  nova: { iconName: 'toggle-nova', fallback: Sparkles },
};

const ANIME_FX_STORAGE_KEY = 'ui.anime90s.fx';
const NOVA_FX_STORAGE_KEY = 'ui.nova.fx';

export function GlobalNav({ userName, userEmail }: GlobalNavProps) {
  const pathname = usePathname();
  const { prefetch } = usePrefetchRoute();
  const [theme, setTheme] = useState<UiTheme>('slate');
  const [animeFxEnabled, setAnimeFxEnabled] = useState(true);
  const [novaFxEnabled, setNovaFxEnabled] = useState(false);
  const [logoHasError, setLogoHasError] = useState(false);
  const [skinAssetsConfig, setSkinAssetsConfig] = useState<SkinAssetsConfig>(() => createDefaultSkinAssetsConfig());

  const applyTheme = (nextTheme: UiTheme, enableAnimeFx: boolean, enableNovaFx: boolean) => {
    const root = document.documentElement;
    root.classList.remove(
      'dark',
      'windows95',
      'slate',
      'sparkle',
      'douala',
      'anime90s',
      'skin-effects-rich',
      'fanta',
      'colordore',
      'pc98',
      'retromarket',
      'nova',
      'commodore'
    );
    if (nextTheme === 'windows95') root.classList.add('windows95');
    if (nextTheme === 'slate') root.classList.add('slate');
    if (nextTheme === 'sparkle') root.classList.add('sparkle');
    if (nextTheme === 'douala') root.classList.add('douala');
    if (nextTheme === 'anime90s') {
      root.classList.add('anime90s');
      if (enableAnimeFx) root.classList.add('skin-effects-rich');
    }
    if (nextTheme === 'colordore') root.classList.add('colordore');
    if (nextTheme === 'pc98') root.classList.add('pc98');
    if (nextTheme === 'retromarket') root.classList.add('retromarket');
    if (nextTheme === 'nova') {
      root.classList.add('nova');
      if (enableNovaFx) root.classList.add('skin-effects-rich');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = window.localStorage.getItem('ui.theme');
    const mappedStoredTheme = storedTheme === 'commodore' ? 'colordore' : storedTheme;
    const nextTheme =
      mappedStoredTheme && UI_THEMES.includes(mappedStoredTheme as UiTheme)
        ? (mappedStoredTheme as UiTheme)
        : 'slate';
    const storedAnimeFx = window.localStorage.getItem(ANIME_FX_STORAGE_KEY);
    const storedNovaFx = window.localStorage.getItem(NOVA_FX_STORAGE_KEY);
    const nextAnimeFxEnabled = storedAnimeFx === null ? true : storedAnimeFx === '1';
    const nextNovaFxEnabled = storedNovaFx === null ? false : storedNovaFx === '1';
    setTheme(nextTheme);
    setAnimeFxEnabled(nextAnimeFxEnabled);
    setNovaFxEnabled(nextNovaFxEnabled);
    applyTheme(nextTheme, nextAnimeFxEnabled, nextNovaFxEnabled);
  }, []);

  const loadSkinAssetsConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/skins');
      const payload = await response.json();
      if (!payload?.success) return;

      const nextConfig = cacheSkinAssetsConfig(normalizeSkinAssetsConfig(payload.data?.config));
      setSkinAssetsConfig(nextConfig);
    } catch {
      // Keep defaults on fetch failure.
    }
  }, []);

  useEffect(() => {
    const cachedConfig = getCachedSkinAssetsConfig();
    if (cachedConfig) {
      setSkinAssetsConfig(cachedConfig);
    }

    void loadSkinAssetsConfig();
    return subscribeToSkinAssetsConfig((nextConfig) => {
      setSkinAssetsConfig(cacheSkinAssetsConfig(nextConfig));
    });
  }, [loadSkinAssetsConfig]);

  const activeSkinAssets = useMemo(
    () => skinAssetsConfig[theme] ?? createDefaultThemeSkinAssets(theme),
    [skinAssetsConfig, theme]
  );

  useEffect(() => {
    applyThemeSkinCssVariables(theme, activeSkinAssets);
  }, [theme, activeSkinAssets]);

  useEffect(() => {
    setLogoHasError(false);
  }, [theme, activeSkinAssets.logoEnabled, activeSkinAssets.logoPath]);

  const setSkin = (nextTheme: UiTheme) => {
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      applyTheme(nextTheme, animeFxEnabled, novaFxEnabled);
      window.localStorage.setItem('ui.theme', nextTheme);
    }
  };

  const setAnimeFx = (enabled: boolean) => {
    setAnimeFxEnabled(enabled);
    if (typeof window !== 'undefined') {
      applyTheme(theme, enabled, novaFxEnabled);
      window.localStorage.setItem(ANIME_FX_STORAGE_KEY, enabled ? '1' : '0');
    }
  };

  const setNovaFx = (enabled: boolean) => {
    setNovaFxEnabled(enabled);
    if (typeof window !== 'undefined') {
      applyTheme(theme, animeFxEnabled, enabled);
      window.localStorage.setItem(NOVA_FX_STORAGE_KEY, enabled ? '1' : '0');
    }
  };

  // Determine active page based on pathname
  const getIsActive = (href: string) => {
    if (href === '/boards') {
      // /boards is active for /boards but not /boards/[id]
      return pathname === '/boards';
    }
    return pathname.startsWith(href);
  };

  const themeToggleIcon = themeToggleIcons[theme];
  const hasValidLogoPath = isSupportedAssetPath(activeSkinAssets.logoPath);
  const shouldShowCustomLogo = activeSkinAssets.logoEnabled && hasValidLogoPath && !logoHasError;
  const isDoualaTheme = theme === 'douala';
  const isWideFallbackTheme = theme === 'douala' || theme === 'anime90s' || theme === 'nova';
  const logoFallbackText = theme === 'douala' ? 'FALLO' : theme === 'anime90s' ? 'EVA' : theme === 'nova' ? 'NOVA' : 'PP';

  return (
    <header className="global-top-header border-b border-border bg-surface px-6 py-4">
      <div className="flex items-center justify-between">
        <nav className="global-nav-links flex items-center gap-1">
          <Link
            href="/home"
            className="mr-2 inline-flex h-8 items-center justify-center rounded-md px-1"
            aria-label="Go to home"
          >
            {shouldShowCustomLogo ? (
              <Image
                src={activeSkinAssets.logoPath.trim()}
                alt="Theme logo"
                width={192}
                height={48}
                unoptimized
                className="h-12 w-auto max-w-[280px] object-contain"
                onError={() => setLogoHasError(true)}
              />
            ) : (
              <span
                className={cn(
                  'theme-logo-fallback inline-flex h-12 items-center justify-center text-xl font-semibold leading-none text-text-secondary',
                  isWideFallbackTheme ? 'px-2 text-2xl font-black' : 'w-16'
                )}
              >
                {logoFallbackText}
              </span>
            )}
          </Link>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsActive(item.href);
            const slateAccentStyle = theme === 'slate'
              ? ({
                  ['--slate-nav-fill' as string]: item.slateAccent.fill,
                  ['--slate-nav-fill-strong' as string]: item.slateAccent.fillStrong,
                  ['--slate-nav-solid' as string]: item.slateAccent.solid,
                  ['--slate-nav-solid-deep' as string]: item.slateAccent.solidDeep,
                  ['--slate-nav-border' as string]: item.slateAccent.border,
                  ['--slate-nav-border-strong' as string]: item.slateAccent.borderStrong,
                  ['--slate-nav-icon' as string]: item.slateAccent.icon,
                } as CSSProperties)
              : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => prefetch(item.href)}
                onFocus={() => prefetch(item.href)}
                data-slate-accent={theme === 'slate' ? 'true' : undefined}
                style={slateAccentStyle}
                className={cn(
                  'global-nav-item flex items-center gap-2 px-3 py-1.5 rounded-md text-body transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                )}
              >
                <span className="sparkle-icon-chip" aria-hidden="true">
                  <ThemeIcon
                    theme={theme}
                    iconName={item.iconName}
                    fallback={Icon}
                    useCustom={activeSkinAssets.iconEnabled[item.iconName]}
                    customSrc={getConfiguredSkinIconPath(theme, activeSkinAssets, item.iconName)}
                    className="h-4 w-4 sparkle-icon-glyph"
                  />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="global-nav-actions flex items-center gap-4">
          <NotificationBell />
          <span className="text-body text-text-secondary">
            {userName || userEmail}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'global-skin-trigger inline-flex items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors',
                  isDoualaTheme ? 'h-9 gap-1 px-3' : 'h-8 w-8'
                )}
                title="Choose skin"
                aria-label="Choose skin"
              >
                <ThemeIcon
                  theme={theme}
                  iconName={themeToggleIcon.iconName}
                  fallback={themeToggleIcon.fallback}
                  useCustom={activeSkinAssets.iconEnabled[themeToggleIcon.iconName]}
                  customSrc={getConfiguredSkinIconPath(theme, activeSkinAssets, themeToggleIcon.iconName)}
                  className="h-4 w-4"
                />
                {isDoualaTheme && <span className="text-tiny tracking-wide">Skin</span>}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Skin</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setSkin(value as UiTheme)}>
                <DropdownMenuRadioItem value="windows95">Windows 95</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="slate">Slate</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="sparkle">Sparkle</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="douala">Douala</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="anime90s">EVA</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="colordore">Colordore</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="pc98">PC-98</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="retromarket">Retro Market</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="nova">Nova</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={animeFxEnabled}
                disabled={theme !== 'anime90s'}
                onCheckedChange={(checked) => setAnimeFx(checked === true)}
              >
                EVA FX (glow + motion)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={novaFxEnabled}
                disabled={theme !== 'nova'}
                onCheckedChange={(checked) => setNovaFx(checked === true)}
              >
                Nova FX (glow + motion)
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
