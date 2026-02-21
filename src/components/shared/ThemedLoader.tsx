'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  getCachedSkinAssetsConfig,
  isSupportedAssetPath,
  UI_THEMES,
  type UiTheme,
} from '@/lib/skin-assets';

interface ThemedLoaderProps {
  /** Optional message below the loader */
  message?: string;
}

function getThemeFromDom(): UiTheme {
  if (typeof window === 'undefined') return 'windows95';
  const stored = window.localStorage.getItem('ui.theme');
  const mappedStoredTheme = stored === 'commodore' ? 'colordore' : stored;
  if (!mappedStoredTheme) return 'windows95';
  return UI_THEMES.includes(mappedStoredTheme as UiTheme) ? (mappedStoredTheme as UiTheme) : 'windows95';
}

function getLogoFallbackText(theme: UiTheme): string {
  if (theme === 'douala') return 'FALLO';
  return 'PP';
}

export function ThemedLoader({ message }: ThemedLoaderProps) {
  const [theme, setTheme] = useState<UiTheme>('windows95');
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const currentTheme = getThemeFromDom();
    setTheme(currentTheme);

    const config = getCachedSkinAssetsConfig();
    if (config) {
      const assets = config[currentTheme];
      if (assets?.logoEnabled && isSupportedAssetPath(assets.logoPath)) {
        setLogoPath(assets.logoPath.trim());
      }
    }
  }, []);

  const showCustomLogo = logoPath && !logoError;

  return (
    <div className="themed-loader flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        {/* Logo / Brand */}
        <div className="themed-loader-brand">
          {showCustomLogo ? (
            <Image
              src={logoPath}
              alt="Logo"
              width={192}
              height={48}
              unoptimized
              className="h-12 w-auto max-w-[240px] object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="text-2xl font-bold text-text-secondary">
              {getLogoFallbackText(theme)}
            </span>
          )}
        </div>

        {/* Animated dots */}
        <div className="themed-loader-dots flex items-center gap-1.5">
          <span className="themed-loader-dot" />
          <span className="themed-loader-dot" />
          <span className="themed-loader-dot" />
        </div>

        {/* Optional message */}
        {message && (
          <p className="text-caption text-text-tertiary">{message}</p>
        )}
      </div>
    </div>
  );
}
