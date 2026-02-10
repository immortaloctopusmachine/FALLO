'use client';

import Link from 'next/link';
import { Building2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudioCardProps {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  color?: string | null;
  teamCount: number;
}

export function StudioCard({
  id,
  name,
  description,
  image,
  color,
  teamCount,
}: StudioCardProps) {
  return (
    <Link
      href={`/studios/${id}`}
      className="group block rounded-lg border border-border bg-surface overflow-hidden transition-colors hover:border-border hover:bg-surface-raised"
    >
      {/* Header Image or Color Banner */}
      <div
        className="h-24 bg-gradient-to-br from-card-epic/20 to-card-epic/5"
        style={{
          backgroundImage: image ? `url(${image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: !image && color ? color : undefined,
        }}
      />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
              'bg-card-epic/10 text-card-epic'
            )}
          >
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-title font-semibold text-text-primary group-hover:text-card-epic">
              {name}
            </h3>
            {description && (
              <p className="mt-1 line-clamp-2 text-caption text-text-secondary">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-caption text-text-tertiary">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>{teamCount} teams</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
