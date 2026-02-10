'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Tag, Layers, Calendar, Users, ArrowLeft, Plug, Library } from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsNav = [
  { name: 'Integrations', href: '/settings/integrations', icon: Plug },
  { name: 'Skills', href: '/settings/skills', icon: Sparkles },
  { name: 'Roles', href: '/settings/roles', icon: Users },
  { name: 'Tags', href: '/settings/tags', icon: Tag },
  { name: 'Block Types', href: '/settings/block-types', icon: Layers },
  { name: 'Event Types', href: '/settings/event-types', icon: Calendar },
  { name: 'Core Templates', href: '/settings/core-project-templates', icon: Library },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/boards"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-body">Back to Boards</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-heading font-semibold">Settings</h1>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 border-r border-border bg-surface p-4">
          <ul className="space-y-1">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-body transition-colors',
                      isActive
                        ? 'bg-card-epic/10 text-card-epic font-medium'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
