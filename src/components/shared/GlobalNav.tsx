'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
}

const navItems: NavItem[] = [
  { href: '/home', label: 'Home', icon: Home, iconName: 'nav-home' },
  { href: '/timeline', label: 'Timeline', icon: Calendar, iconName: 'nav-timeline' },
  { href: '/projects', label: 'Projects', icon: FolderKanban, iconName: 'nav-projects' },
  { href: '/boards', label: 'Boards', icon: LayoutGrid, iconName: 'nav-boards' },
  { href: '/organization', label: 'Organization', icon: Building2, iconName: 'nav-organization' },
  { href: '/teams', label: 'Teams', icon: Users, iconName: 'nav-teams' },
  { href: '/users', label: 'Users', icon: User, iconName: 'nav-users' },

  { href: '/settings', label: 'Settings', icon: Settings, iconName: 'nav-settings' },
];

const themeToggleIcons: Record<UiTheme, { iconName: SkinIconName; fallback: LucideIcon }> = {
  light: { iconName: 'toggle-light', fallback: Sun },
  windows95: { iconName: 'toggle-windows95', fallback: Monitor },
  slate: { iconName: 'toggle-slate', fallback: Palette },
  sparkle: { iconName: 'toggle-sparkle', fallback: Sparkles },
  douala: { iconName: 'toggle-douala', fallback: Flame },
  colordore: { iconName: 'toggle-colordore', fallback: Monitor },
  pc98: { iconName: 'toggle-pc98', fallback: Gamepad2 },
  retromarket: { iconName: 'toggle-retromarket', fallback: BarChart3 },
};

export function GlobalNav({ userName, userEmail }: GlobalNavProps) {
  const pathname = usePathname();
  const { prefetch } = usePrefetchRoute();
  const [theme, setTheme] = useState<UiTheme>('windows95');
  const [logoHasError, setLogoHasError] = useState(false);
  const [skinAssetsConfig, setSkinAssetsConfig] = useState<SkinAssetsConfig>(
    () => getCachedSkinAssetsConfig() ?? createDefaultSkinAssetsConfig()
  );

  const applyTheme = (nextTheme: UiTheme) => {
    const root = document.documentElement;
    root.classList.remove(
      'dark',
      'windows95',
      'slate',
      'sparkle',
      'douala',
      'fanta',
      'colordore',
      'pc98',
      'retromarket',
      'commodore'
    );
    if (nextTheme === 'windows95') root.classList.add('windows95');
    if (nextTheme === 'slate') root.classList.add('slate');
    if (nextTheme === 'sparkle') root.classList.add('sparkle');
    if (nextTheme === 'douala') root.classList.add('douala');
    if (nextTheme === 'colordore') root.classList.add('colordore');
    if (nextTheme === 'pc98') root.classList.add('pc98');
    if (nextTheme === 'retromarket') root.classList.add('retromarket');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = window.localStorage.getItem('ui.theme');
    const mappedStoredTheme = storedTheme === 'commodore' ? 'colordore' : storedTheme;
    const nextTheme =
      mappedStoredTheme && UI_THEMES.includes(mappedStoredTheme as UiTheme)
        ? (mappedStoredTheme as UiTheme)
        : 'windows95';
    setTheme(nextTheme);
    applyTheme(nextTheme);
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
      applyTheme(nextTheme);
      window.localStorage.setItem('ui.theme', nextTheme);
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
                  isDoualaTheme ? 'px-2 text-2xl font-black' : 'w-16'
                )}
              >
                {isDoualaTheme ? 'FALLO' : 'PP'}
              </span>
            )}
          </Link>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => prefetch(item.href)}
                onFocus={() => prefetch(item.href)}
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
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Skin</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setSkin(value as UiTheme)}>
                <DropdownMenuRadioItem value="windows95">Windows 95</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="slate">Slate</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="sparkle">Sparkle</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="douala">Douala</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="colordore">Colordore</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="pc98">PC-98</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="retromarket">Retro Market</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
