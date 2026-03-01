'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useLessonDetail, useSubmitLessonQuiz } from '@/hooks/api/use-academy';
import { ContentBlockRenderer } from './ContentBlockRenderer';
import { QuizViewer } from './QuizViewer';
import { EditModeToggle } from './EditModeToggle';
import { LessonEditor } from './LessonEditor';
import type { ContentBlock, QuizQuestion } from '@/types/academy';

interface LessonDetailClientProps {
  courseId: string;
  lessonId: string;
  isSuperAdmin: boolean;
}

export function LessonDetailClient({ courseId, lessonId, isSuperAdmin }: LessonDetailClientProps) {
  const [editMode, setEditMode] = useState(false);
  const { data: lesson, isLoading } = useLessonDetail(courseId, lessonId);
  const submitQuiz = useSubmitLessonQuiz(courseId, lessonId);

  if (isLoading || !lesson) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-surface-hover" />
        <div className="h-48 w-full animate-pulse rounded bg-surface-hover" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-hover" />
      </div>
    );
  }

  // Check if this lesson is locked (enforce order + previous not passed)
  const isLocked = lesson.course.enforceOrder && lesson.previousLesson && !lesson.previousLesson.passed;

  if (isLocked && !isSuperAdmin) {
    return (
      <div className="p-6">
        <Link href={`/academy/courses/${courseId}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to {lesson.course.title}
        </Link>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Lock className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium">Lesson Locked</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete &quot;{lesson.previousLesson?.title}&quot; first to unlock this lesson.
          </p>
          <Link
            href={`/academy/courses/${courseId}/lessons/${lesson.previousLesson?.id}`}
            className="mt-4 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Go to previous lesson
          </Link>
        </div>
      </div>
    );
  }

  const contentBlocks = lesson.contentBlocks as ContentBlock[];
  const quizQuestions = lesson.quiz as QuizQuestion[];

  if (editMode && isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Link href={`/academy/courses/${courseId}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to {lesson.course.title}
          </Link>
          <EditModeToggle editMode={editMode} onToggle={setEditMode} />
        </div>
        <LessonEditor lesson={lesson} />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Nav */}
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/academy/courses/${courseId}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to {lesson.course.title}
        </Link>
        {isSuperAdmin && (
          <EditModeToggle editMode={editMode} onToggle={setEditMode} />
        )}
      </div>

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground mb-1">
          Lesson {lesson.position + 1}
        </p>
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
        {lesson.description && (
          <p className="mt-2 text-sm text-muted-foreground">{lesson.description}</p>
        )}
      </div>

      {/* Content */}
      <div className="mb-8">
        <ContentBlockRenderer blocks={contentBlocks} />
      </div>

      {/* Quiz */}
      {quizQuestions.length > 0 && (
        <div className="mb-8 border-t pt-6">
          <QuizViewer
            questions={quizQuestions}
            passingScore={lesson.passingScore}
            onSubmit={async (answers) => {
              const result = await submitQuiz.mutateAsync({ answers });
              return result;
            }}
            previousResult={lesson.userProgress
              ? { passed: lesson.userProgress.passed, quizScore: lesson.userProgress.quizScore, attempts: lesson.userProgress.attempts }
              : null
            }
          />
        </div>
      )}

      {/* Prev/Next navigation */}
      <div className="flex items-center justify-between border-t pt-4">
        {lesson.previousLesson ? (
          <Link
            href={`/academy/courses/${courseId}/lessons/${lesson.previousLesson.id}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{lesson.previousLesson.title}</span>
            <span className="sm:hidden">Previous</span>
          </Link>
        ) : (
          <div />
        )}

        {lesson.nextLesson ? (
          <Link
            href={`/academy/courses/${courseId}/lessons/${lesson.nextLesson.id}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="hidden sm:inline">{lesson.nextLesson.title}</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            href={`/academy/courses/${courseId}`}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Back to course overview
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
