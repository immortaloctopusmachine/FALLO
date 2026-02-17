'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Tag,
  Layers,
  Calendar,
  Users,
  Plug,
  Library,
  Boxes,
  ListOrdered,
  FileQuestion,
  Images,
  Bone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const baseSettingsNav = [
  { name: 'Integrations', href: '/settings/integrations', icon: Plug },
  { name: 'Skills', href: '/settings/skills', icon: Sparkles },
  { name: 'Epic Names', href: '/settings/epic-names', icon: ListOrdered },
  { name: 'Modules', href: '/settings/modules', icon: Boxes },
  { name: 'Roles', href: '/settings/roles', icon: Users },
  { name: 'Tags', href: '/settings/tags', icon: Tag },
  { name: 'Block Types', href: '/settings/block-types', icon: Layers },
  { name: 'Event Types', href: '/settings/event-types', icon: Calendar },
  { name: 'Core Templates', href: '/settings/core-project-templates', icon: Library },
];

interface SettingsSidebarNavProps {
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

export function SettingsSidebarNav({ isSuperAdmin, isAdmin }: SettingsSidebarNavProps) {
  const pathname = usePathname();

  const settingsNav = [
    ...baseSettingsNav,
    ...(isAdmin ? [{ name: 'Spine Modules', href: '/settings/spine-modules', icon: Bone }] : []),
    ...(isSuperAdmin
      ? [
          { name: 'Uploads', href: '/settings/uploads', icon: Images },
          { name: 'Review Questions', href: '/settings/review-questions', icon: FileQuestion },
        ]
      : []),
  ];

  return (
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
  );
}
