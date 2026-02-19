'use client';

import { useEffect, useState } from 'react';
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
  Moon,
  Sun,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from './NotificationBell';

interface GlobalNavProps {
  userName?: string | null;
  userEmail?: string | null;
}

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/timeline', label: 'Timeline', icon: Calendar },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/boards', label: 'Boards', icon: LayoutGrid },
  { href: '/organization', label: 'Organization', icon: Building2 },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/users', label: 'Users', icon: User },

  { href: '/settings', label: 'Settings', icon: Settings },
];

export function GlobalNav({ userName, userEmail }: GlobalNavProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'dark' | 'slate' | 'light' | 'sparkle'>('slate');

  const applyTheme = (nextTheme: 'dark' | 'slate' | 'light' | 'sparkle') => {
    const root = document.documentElement;
    root.classList.remove('dark', 'slate', 'sparkle');
    if (nextTheme === 'dark') root.classList.add('dark');
    if (nextTheme === 'slate') root.classList.add('slate');
    if (nextTheme === 'sparkle') root.classList.add('sparkle');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = window.localStorage.getItem('ui.theme');
    const nextTheme =
      storedTheme === 'light' || storedTheme === 'slate' || storedTheme === 'dark' || storedTheme === 'sparkle'
        ? storedTheme
        : 'slate';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const setSkin = (nextTheme: 'dark' | 'slate' | 'light' | 'sparkle') => {
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

  return (
    <header className="border-b border-border bg-surface px-6 py-4">
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-body transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                )}
              >
                <span className="sparkle-icon-chip" aria-hidden="true">
                  <Icon className="h-4 w-4 sparkle-icon-glyph" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <span className="text-body text-text-secondary">
            {userName || userEmail}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                title="Choose skin"
                aria-label="Choose skin"
              >
                {theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'slate' ? <Palette className="h-4 w-4" /> : theme === 'sparkle' ? <Sparkles className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Skin</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setSkin(value as 'dark' | 'slate' | 'light' | 'sparkle')}>
                <DropdownMenuRadioItem value="dark">Dark (Noir)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="slate">Slate</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="sparkle">Sparkle</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
