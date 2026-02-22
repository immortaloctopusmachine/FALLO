'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SkinIconName } from '@/lib/skin-assets';

interface NovaThemeIconProps {
  iconName: SkinIconName;
  fallback: LucideIcon;
  className?: string;
}

export function NovaThemeIcon({ iconName, fallback: FallbackIcon, className }: NovaThemeIconProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [iconName]);

  const src = useMemo(() => `/skins/icons/nova/${iconName}.svg`, [iconName]);

  if (hasError) {
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
