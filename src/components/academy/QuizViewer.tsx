'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { requestBadgeOverlayRefresh } from '@/lib/rewards/client-events';
import type { QuizQuestion, QuizResult } from '@/types/academy';

interface QuizViewerProps {
  questions: QuizQuestion[];
  passingScore: number;
  onSubmit: (answers: Record<string, string>) => Promise<QuizResult>;
  previousResult?: { passed: boolean; quizScore: number | null; attempts: number } | null;
}

export function QuizViewer({ questions, passingScore, onSubmit, previousResult }: QuizViewerProps) {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showQuiz, setShowQuiz] = useState(!previousResult?.passed);

  if (questions.length === 0) return null;

  const allAnswered = questions.every((q) => answers[q.id]);

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    try {
      const quizResult = await onSubmit(answers);
      setResult(quizResult);
      if (quizResult.badgeAwarded) {
        void queryClient.invalidateQueries({ queryKey: ['badges', 'my'] });
        void queryClient.invalidateQueries({ queryKey: ['home'] });
        requestBadgeOverlayRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setResult(null);
    setShowQuiz(true);
  };

  // Show result summary
  if (result) {
    return <QuizResultView result={result} onRetake={handleRetake} />;
  }

  // Already passed — show summary with retake option
  if (previousResult?.passed && !showQuiz) {
    return (
      <div className="rounded-lg border bg-green-50 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium text-green-700">
            Quiz passed! Score: {previousResult.quizScore}%
          </span>
        </div>
        <p className="mt-1 text-xs text-green-600">
          Attempts: {previousResult.attempts}
        </p>
        <button
          onClick={handleRetake}
          className="mt-2 text-xs text-green-600 underline hover:text-green-700"
        >
          Retake quiz
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Quiz</h3>
        <span className="text-xs text-muted-foreground">
          Passing score: {passingScore}%
        </span>
      </div>

      {questions.map((question, index) => (
        <div key={question.id} className="space-y-2">
          <p className="text-sm font-medium">
            {index + 1}. {question.question}
          </p>
          <div className="space-y-1.5 pl-4">
            {question.options.map((option) => (
              <label
                key={option.id}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors',
                  answers[question.id] === option.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-surface-hover'
                )}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={answers[question.id] === option.id}
                  onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
                  className="h-3.5 w-3.5"
                />
                {option.text}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between border-t pt-4">
        <span className="text-xs text-muted-foreground">
          {Object.keys(answers).length}/{questions.length} answered
        </span>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Submit Quiz
        </button>
      </div>
    </div>
  );
}

function QuizResultView({ result, onRetake }: { result: QuizResult; onRetake: () => void }) {
  return (
    <div className={cn(
      'rounded-lg border p-4',
      result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
    )}>
      <div className="flex items-center gap-2">
        {result.passed ? (
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        ) : (
          <XCircle className="h-6 w-6 text-red-500" />
        )}
        <div>
          <p className={cn('text-sm font-semibold', result.passed ? 'text-green-700' : 'text-red-700')}>
            {result.passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
          </p>
          <p className={cn('text-xs', result.passed ? 'text-green-600' : 'text-red-600')}>
            Score: {result.score}% ({result.correctCount}/{result.totalQuestions} correct)
          </p>
        </div>
      </div>

      {/* Rewards */}
      {result.coinsEarned > 0 && (
        <p className="mt-2 text-xs font-medium text-yellow-600">
          +{result.coinsEarned} coins earned!
        </p>
      )}
      {result.badgeAwarded && (
        <p className="mt-1 text-xs font-medium text-purple-600">
          Badge earned: {result.badgeAwarded.name}
        </p>
      )}

      {/* Per-question breakdown */}
      <div className="mt-4 space-y-2">
        {result.questionResults.map((qr, i) => (
          <div key={qr.questionId} className="flex items-start gap-2 text-xs">
            {qr.correct ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
            ) : (
              <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" />
            )}
            <div>
              <span className={cn('font-medium', qr.correct ? 'text-green-700' : 'text-red-700')}>
                Question {i + 1}: {qr.correct ? 'Correct' : 'Incorrect'}
              </span>
              {qr.explanation && (
                <p className="mt-0.5 text-muted-foreground">{qr.explanation}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onRetake}
        className="mt-4 text-xs underline hover:no-underline"
      >
        Retake quiz
      </button>
    </div>
  );
}
