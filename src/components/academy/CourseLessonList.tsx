'use client';

import Link from 'next/link';
import { CheckCircle2, Lock, Circle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AcademyLesson, AcademyProgress } from '@/types/academy';

interface CourseLessonListProps {
  courseId: string;
  lessons: AcademyLesson[];
  lessonProgress: Record<string, AcademyProgress>;
  enforceOrder: boolean;
}

export function CourseLessonList({ courseId, lessons, lessonProgress, enforceOrder }: CourseLessonListProps) {
  return (
    <div className="space-y-1">
      {lessons.map((lesson, index) => {
        const progress = lessonProgress[lesson.id];
        const isPassed = progress?.passed ?? false;
        const hasAttempted = (progress?.attempts ?? 0) > 0;

        // Check if this lesson is locked (enforce order: previous must be passed)
        let isLocked = false;
        if (enforceOrder && index > 0) {
          const prevLessonId = lessons[index - 1].id;
          const prevProgress = lessonProgress[prevLessonId];
          isLocked = !prevProgress?.passed;
        }

        return (
          <Link
            key={lesson.id}
            href={isLocked ? '#' : `/academy/courses/${courseId}/lessons/${lesson.id}`}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
              isLocked
                ? 'cursor-not-allowed opacity-50'
                : 'hover:bg-surface-hover',
              isPassed && 'border-green-200 bg-green-50/50'
            )}
            onClick={(e) => { if (isLocked) e.preventDefault(); }}
          >
            {/* Status icon */}
            <div className="flex-shrink-0">
              {isPassed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : isLocked ? (
                <Lock className="h-5 w-5 text-muted-foreground/40" />
              ) : hasAttempted ? (
                <Circle className="h-5 w-5 text-yellow-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/30" />
              )}
            </div>

            {/* Lesson info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Lesson {index + 1}</span>
                {isPassed && progress?.quizScore !== null && (
                  <span className="text-[10px] text-green-600">
                    Score: {progress.quizScore}%
                  </span>
                )}
              </div>
              <p className="truncate text-sm font-medium">{lesson.title}</p>
              {lesson.description && (
                <p className="truncate text-xs text-muted-foreground">{lesson.description}</p>
              )}
            </div>

            {/* Arrow */}
            {!isLocked && (
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
