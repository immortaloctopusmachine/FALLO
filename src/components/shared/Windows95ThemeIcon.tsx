'use client';

import type React from 'react';
import {
  Computer3,
  Date,
  FolderOpen,
  Taskman100,
  MicrosoftNetwork,
  User2,
  User,
  Settings,
  Globe,
  WindowsExplorer,
  Star,
  Mshearts1,
  Timedate,
  FlyingWindows100,
  WindowGraph,
} from '@react95/icons';
import type { SkinIconName } from '@/lib/skin-assets';
import { cn } from '@/lib/utils';

type Win95IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const WINDOWS95_ICON_MAP: Record<SkinIconName, Win95IconComponent> = {
  'nav-home': Computer3,
  'nav-timeline': Date,
  'nav-projects': FolderOpen,
  'nav-boards': Taskman100,
  'nav-organization': MicrosoftNetwork,
  'nav-teams': User2,
  'nav-users': User,
  'nav-settings': Settings,
  'toggle-light': Globe,
  'toggle-windows95': WindowsExplorer,
  'toggle-slate': Computer3,
  'toggle-sparkle': Star,
  'toggle-douala': Mshearts1,
  'toggle-colordore': FlyingWindows100,
  'toggle-pc98': Timedate,
  'toggle-retromarket': WindowGraph,
  'ornament-star': Star,
  'ornament-heart': Mshearts1,
  'ornament-moon': Timedate,
};

interface Windows95ThemeIconProps {
  iconName: SkinIconName;
  className?: string;
}

export function Windows95ThemeIcon({ iconName, className }: Windows95ThemeIconProps) {
  const Icon = WINDOWS95_ICON_MAP[iconName];
  return <Icon className={cn('windows95-pack-icon inline-block shrink-0 object-contain', className)} aria-hidden="true" />;
}

