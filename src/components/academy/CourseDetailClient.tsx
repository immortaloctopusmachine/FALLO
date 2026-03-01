'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, GraduationCap, Clock, Coins, Award, BookOpen, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCourseDetail, useSubmitCourseQuiz } from '@/hooks/api/use-academy';
import { CourseLessonList } from './CourseLessonList';
import { QuizViewer } from './QuizViewer';
import { EditModeToggle } from './EditModeToggle';
import { CourseEditor } from './CourseEditor';
import type { QuizQuestion, AcademyProgress } from '@/types/academy';

const DIFFICULTY_COLORS = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  ADVANCED: 'bg-red-100 text-red-700',
} as const;

interface CourseDetailClientProps {
  courseId: string;
  isSuperAdmin: boolean;
}

export function CourseDetailClient({ courseId, isSuperAdmin }: CourseDetailClientProps) {
  const [editMode, setEditMode] = useState(false);
  const { data: course, isLoading } = useCourseDetail(courseId);
  const submitQuiz = useSubmitCourseQuiz(courseId);

  if (isLoading || !course) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-surface-hover" />
        <div className="h-48 w-full animate-pulse rounded bg-surface-hover" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded bg-surface-hover" />
          ))}
        </div>
      </div>
    );
  }

  const finalQuiz = course.finalQuiz as QuizQuestion[];
  const lessonProgress = (course.lessonProgress ?? {}) as Record<string, AcademyProgress>;
  const allLessonsPassed = course.lessons.every((l) => lessonProgress[l.id]?.passed);
  const lessonsCompleted = course.lessons.filter((l) => lessonProgress[l.id]?.passed).length;

  if (editMode && isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/academy" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Academy
          </Link>
          <EditModeToggle editMode={editMode} onToggle={setEditMode} />
        </div>
        <CourseEditor course={course} />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Nav */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/academy" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Academy
        </Link>
        {isSuperAdmin && (
          <EditModeToggle editMode={editMode} onToggle={setEditMode} />
        )}
      </div>

      {/* Cover image */}
      {course.coverImage && (
        <div className="relative mb-6 h-48 overflow-hidden rounded-lg border sm:h-64">
          <Image src={course.coverImage} alt={course.title} fill className="object-cover" sizes="800px" />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded bg-purple-500/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
            Course
          </span>
          {course.difficulty && (
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', DIFFICULTY_COLORS[course.difficulty])}>
              {course.difficulty}
            </span>
          )}
          {course.category && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: course.category.color || '#6366f1' }}
            >
              {course.category.name}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold">{course.title}</h1>

        {course.description && (
          <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>
        )}

        {/* Meta */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {course.creatorName && (
            <div className="flex items-center gap-1.5">
              {course.creatorAvatar ? (
                <Image src={course.creatorAvatar} alt={course.creatorName} width={20} height={20} className="rounded-full" />
              ) : (
                <GraduationCap className="h-4 w-4" />
              )}
              <span>{course.creatorName}</span>
            </div>
          )}
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {course.lessons.length} lesson{course.lessons.length !== 1 ? 's' : ''}
          </span>
          {course.estimatedMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {course.estimatedMinutes} min
            </span>
          )}
          {course.coinsReward > 0 && (
            <span className="flex items-center gap-1 text-yellow-600">
              <Coins className="h-3.5 w-3.5" />
              {course.coinsReward} coins
            </span>
          )}
          {course.badgeReward && (
            <span className="flex items-center gap-1 text-purple-600">
              <Award className="h-3.5 w-3.5" />
              {course.badgeReward.name}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {course.lessons.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{lessonsCompleted}/{course.lessons.length} lessons completed</span>
              {course.userProgress?.passed && (
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Course completed
                </span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(lessonsCompleted / course.lessons.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Lesson list */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold">Lessons</h2>
        <CourseLessonList
          courseId={courseId}
          lessons={course.lessons}
          lessonProgress={lessonProgress}
          enforceOrder={course.enforceOrder}
        />
      </div>

      {/* Final quiz */}
      {finalQuiz.length > 0 && (
        <div className="border-t pt-6">
          <h2 className="mb-3 text-sm font-semibold">Final Course Quiz</h2>
          {!allLessonsPassed ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Complete all lessons to unlock the final quiz.
            </div>
          ) : (
            <QuizViewer
              questions={finalQuiz}
              passingScore={course.passingScore}
              onSubmit={async (answers) => {
                const result = await submitQuiz.mutateAsync({ answers });
                return result;
              }}
              previousResult={course.userProgress
                ? { passed: course.userProgress.passed, quizScore: course.userProgress.quizScore, attempts: course.userProgress.attempts }
                : null
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
