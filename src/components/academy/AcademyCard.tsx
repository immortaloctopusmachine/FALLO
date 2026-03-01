'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, GraduationCap, Clock, Coins, Award, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AcademyLandingItem } from '@/types/academy';

interface AcademyCardProps {
  item: AcademyLandingItem;
}

const DIFFICULTY_COLORS = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  ADVANCED: 'bg-red-100 text-red-700',
} as const;

const DIFFICULTY_LABELS = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
} as const;

export function AcademyCard({ item }: AcademyCardProps) {
  const href = item.type === 'tutorial'
    ? `/academy/tutorials/${item.id}`
    : `/academy/courses/${item.id}`;

  const isCompleted = item.userProgress?.passed ?? false;

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md',
        isCompleted && 'ring-2 ring-green-500/30'
      )}
    >
      {/* Cover image */}
      <div className="relative h-32 w-full bg-surface-hover">
        {item.coverImage ? (
          <Image
            src={item.coverImage}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            {item.type === 'tutorial' ? (
              <BookOpen className="h-10 w-10 text-muted-foreground/30" />
            ) : (
              <GraduationCap className="h-10 w-10 text-muted-foreground/30" />
            )}
          </div>
        )}

        {/* Type badge */}
        <span className={cn(
          'absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
          item.type === 'tutorial'
            ? 'bg-blue-500/90 text-white'
            : 'bg-purple-500/90 text-white'
        )}>
          {item.type}
        </span>

        {/* Completed checkmark */}
        {isCompleted && (
          <div className="absolute right-2 top-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 drop-shadow" />
          </div>
        )}

        {/* Status badge for drafts/archived (super admin) */}
        {'status' in item && item.status !== 'PUBLISHED' && (
          <span className="absolute right-2 top-2 rounded bg-orange-500/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
            {String(item.status)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight group-hover:text-primary">
          {item.title}
        </h3>

        {item.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {item.description}
          </p>
        )}

        {/* Creator */}
        {item.creatorName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {item.creatorAvatar ? (
              <Image
                src={item.creatorAvatar}
                alt={item.creatorName}
                width={16}
                height={16}
                className="rounded-full"
              />
            ) : (
              <div className="h-4 w-4 rounded-full bg-surface-hover" />
            )}
            <span className="truncate">{item.creatorName}</span>
          </div>
        )}

        {/* Meta row */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {/* Difficulty */}
          {item.difficulty && (
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', DIFFICULTY_COLORS[item.difficulty])}>
              {DIFFICULTY_LABELS[item.difficulty]}
            </span>
          )}

          {/* Duration */}
          {item.estimatedMinutes && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {item.estimatedMinutes}m
            </span>
          )}

          {/* Lesson count for courses */}
          {item.type === 'course' && item.lessonCount !== undefined && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              {item.lessonCount} lesson{item.lessonCount !== 1 ? 's' : ''}
            </span>
          )}

          {/* Rewards */}
          {item.coinsReward > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-yellow-600">
              <Coins className="h-3 w-3" />
              {item.coinsReward}
            </span>
          )}

          {item.badgeReward && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-purple-600">
              <Award className="h-3 w-3" />
              Badge
            </span>
          )}
        </div>

        {/* Progress bar for courses in progress */}
        {item.type === 'course' && item.userProgress && !item.userProgress.passed && item.userProgress.lessonsCompleted !== undefined && item.userProgress.totalLessons && (
          <div className="mt-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{item.userProgress.lessonsCompleted}/{item.userProgress.totalLessons} lessons</span>
            </div>
            <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(item.userProgress.lessonsCompleted / item.userProgress.totalLessons) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
