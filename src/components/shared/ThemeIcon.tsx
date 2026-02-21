'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSupportedAssetPath, type SkinIconName, type UiTheme } from '@/lib/skin-assets';
import { Windows95ThemeIcon } from './Windows95ThemeIcon';

interface ThemeIconProps {
  theme: UiTheme;
  iconName: SkinIconName;
  fallback: LucideIcon;
  className?: string;
  useCustom?: boolean;
  customSrc?: string;
}

export function ThemeIcon({
  theme,
  iconName,
  fallback: FallbackIcon,
  className,
  useCustom = false,
  customSrc,
}: ThemeIconProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [theme, iconName, useCustom, customSrc]);

  const src = useMemo(() => {
    if (typeof customSrc !== 'string') {
      return null;
    }
    return isSupportedAssetPath(customSrc) ? customSrc : null;
  }, [customSrc]);

  if (!useCustom || hasError || !src) {
    if (theme === 'windows95') {
      return <Windows95ThemeIcon iconName={iconName} className={className} />;
    }

    return <FallbackIcon className={className} aria-hidden="true" />;
  }

  return (
    <Image
      src={src}
      alt=""
      aria-hidden="true"
      width={16}
      height={16}
      unoptimized
      className={cn('inline-block shrink-0 object-contain', className)}
      onError={() => setHasError(true)}
    />
  );
}
