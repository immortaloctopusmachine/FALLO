'use client';

import Link from 'next/link';
import { Calendar, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { BoardSettings } from '@/types';
import { formatDisplayDate } from '@/lib/date-utils';
import { getBoardBackgroundStyle } from '@/lib/board-backgrounds';
import { cn } from '@/lib/utils';

interface ProjectMember {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface ProjectCardProps {
  id: string;
  name: string;
  teamName: string | null;
  teamColor: string | null;
  members: ProjectMember[];
  settings: BoardSettings | null;
}

export function ProjectCard({
  id,
  name,
  teamName,
  teamColor,
  members,
  settings,
}: ProjectCardProps) {
  const startDate = settings?.projectStartDate;
  const lastTweak = settings?.lastDayAnimationTweaks;
  const releaseDate = settings?.releaseDate;
  const bgStyle = settings ? getBoardBackgroundStyle(settings) : undefined;

  const displayMembers = members.slice(0, 5);
  const remainingCount = members.length - 5;

  const cardContent = (
    <div className="space-y-3">
      {/* Project name + team */}
      <div>
        <h3 className="text-title font-semibold text-text-primary group-hover:text-primary truncate">
          {name}
        </h3>
        {teamName && (
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: teamColor || '#71717a' }}
            />
            <span className="text-caption text-text-secondary truncate">{teamName}</span>
          </div>
        )}
      </div>

      {/* Member avatars */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {displayMembers.map(({ user }) => (
            <Avatar key={user.id} className="h-7 w-7 border-2 border-surface">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="text-tiny">
                {(user.name || user.email)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {remainingCount > 0 && (
            <div className="h-7 w-7 rounded-full border-2 border-surface bg-surface-active flex items-center justify-center text-tiny font-medium text-text-secondary">
              +{remainingCount}
            </div>
          )}
        </div>
        <span className="text-caption text-text-tertiary">
          <Users className="h-3 w-3 inline mr-0.5" />
          {members.length}
        </span>
      </div>

      {/* Dates */}
      {(startDate || lastTweak || releaseDate) && (
        <div className="flex flex-wrap gap-2">
          {startDate && (
            <div className="flex items-center gap-1 text-caption text-text-tertiary">
              <Calendar className="h-3 w-3" />
              <span>Start: {formatDisplayDate(startDate)}</span>
            </div>
          )}
          {lastTweak && (
            <div className="text-caption text-text-tertiary">
              Tweak: {formatDisplayDate(lastTweak)}
            </div>
          )}
          {releaseDate && (
            <div className="text-caption text-success font-medium">
              Release: {formatDisplayDate(releaseDate)}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border overflow-hidden transition-colors',
        !bgStyle && 'bg-surface hover:bg-surface-raised'
      )}
      style={bgStyle}
    >
      <Link
        href={`/projects/${id}`}
        className={cn('block', bgStyle ? 'p-2' : 'p-4')}
      >
        {bgStyle ? (
          <div className="w-1/2 rounded-md bg-surface p-3">
            {cardContent}
          </div>
        ) : (
          cardContent
        )}
      </Link>
    </div>
  );
}
