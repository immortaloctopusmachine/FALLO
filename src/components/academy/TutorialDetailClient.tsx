'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BookOpen, Clock, Coins, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTutorialDetail, useSubmitTutorialQuiz } from '@/hooks/api/use-academy';
import { ContentBlockRenderer } from './ContentBlockRenderer';
import { QuizViewer } from './QuizViewer';
import { EditModeToggle } from './EditModeToggle';
import { TutorialEditor } from './TutorialEditor';
import type { ContentBlock, QuizQuestion } from '@/types/academy';

const DIFFICULTY_COLORS = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  ADVANCED: 'bg-red-100 text-red-700',
} as const;

interface TutorialDetailClientProps {
  tutorialId: string;
  isSuperAdmin: boolean;
}

export function TutorialDetailClient({ tutorialId, isSuperAdmin }: TutorialDetailClientProps) {
  const [editMode, setEditMode] = useState(false);
  const { data: tutorial, isLoading } = useTutorialDetail(tutorialId);
  const submitQuiz = useSubmitTutorialQuiz(tutorialId);

  if (isLoading || !tutorial) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-surface-hover" />
        <div className="h-48 w-full animate-pulse rounded bg-surface-hover" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-hover" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-hover" />
      </div>
    );
  }

  const contentBlocks = tutorial.contentBlocks as ContentBlock[];
  const quizQuestions = tutorial.quiz as QuizQuestion[];

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
        <TutorialEditor tutorial={tutorial} />
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
      {tutorial.coverImage && (
        <div className="relative mb-6 h-48 overflow-hidden rounded-lg border sm:h-64">
          <Image
            src={tutorial.coverImage}
            alt={tutorial.title}
            fill
            className="object-cover"
            sizes="800px"
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded bg-blue-500/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
            Tutorial
          </span>
          {tutorial.difficulty && (
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', DIFFICULTY_COLORS[tutorial.difficulty])}>
              {tutorial.difficulty}
            </span>
          )}
          {tutorial.category && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: tutorial.category.color || '#6366f1' }}
            >
              {tutorial.category.name}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold">{tutorial.title}</h1>

        {tutorial.description && (
          <p className="mt-2 text-sm text-muted-foreground">{tutorial.description}</p>
        )}

        {/* Meta */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {tutorial.creatorName && (
            <div className="flex items-center gap-1.5">
              {tutorial.creatorAvatar ? (
                <Image src={tutorial.creatorAvatar} alt={tutorial.creatorName} width={20} height={20} className="rounded-full" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
              <span>{tutorial.creatorName}</span>
            </div>
          )}
          {tutorial.estimatedMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {tutorial.estimatedMinutes} min
            </span>
          )}
          {tutorial.coinsReward > 0 && (
            <span className="flex items-center gap-1 text-yellow-600">
              <Coins className="h-3.5 w-3.5" />
              {tutorial.coinsReward} coins
            </span>
          )}
          {tutorial.badgeReward && (
            <span className="flex items-center gap-1 text-purple-600">
              <Award className="h-3.5 w-3.5" />
              {tutorial.badgeReward.name}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-8">
        <ContentBlockRenderer blocks={contentBlocks} />
      </div>

      {/* Quiz */}
      {quizQuestions.length > 0 && (
        <div className="border-t pt-6">
          <QuizViewer
            questions={quizQuestions}
            passingScore={tutorial.passingScore}
            onSubmit={async (answers) => {
              const result = await submitQuiz.mutateAsync({ answers });
              return result;
            }}
            previousResult={tutorial.userProgress
              ? { passed: tutorial.userProgress.passed, quizScore: tutorial.userProgress.quizScore, attempts: tutorial.userProgress.attempts }
              : null
            }
          />
        </div>
      )}
    </div>
  );
}
