'use client';

import Link from 'next/link';
import { ArrowLeft, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BoardHeaderProps {
  name: string;
  memberCount: number;
}

export function BoardHeader({ name, memberCount }: BoardHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        <Link href="/boards">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-title font-semibold">{name}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 gap-2">
          <Users className="h-4 w-4" />
          <span className="text-caption">{memberCount}</span>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
