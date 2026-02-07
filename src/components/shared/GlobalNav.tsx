'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  FolderKanban,
  LayoutGrid,
  Building2,
  Users,
  User,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalNavProps {
  userName?: string | null;
  userEmail?: string | null;
}

const navItems = [
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
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-body text-text-secondary">
            {userName || userEmail}
          </span>
        </div>
      </div>
    </header>
  );
}
