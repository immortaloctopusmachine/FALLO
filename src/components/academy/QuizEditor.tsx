'use client';

import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuizQuestion, QuizOption, AcademyQuestionType } from '@/types/academy';

interface QuizEditorProps {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function createDefaultOption(text = ''): QuizOption {
  return { id: generateId(), text, isCorrect: false };
}

function createDefaultQuestion(type: AcademyQuestionType = 'MULTIPLE_CHOICE'): QuizQuestion {
  const options = type === 'TRUE_FALSE'
    ? [
        { id: generateId(), text: 'True', isCorrect: true },
        { id: generateId(), text: 'False', isCorrect: false },
      ]
    : [
        createDefaultOption(''),
        createDefaultOption(''),
      ];

  return {
    id: generateId(),
    type,
    question: '',
    options,
    explanation: '',
  };
}

export function QuizEditor({ questions, onChange }: QuizEditorProps) {
  const addQuestion = (type: AcademyQuestionType) => {
    onChange([...questions, createDefaultQuestion(type)]);
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex: number) => {
    const q = questions[questionIndex];
    if (q.options.length >= 4) return;
    const updated = [...questions];
    updated[questionIndex] = { ...q, options: [...q.options, createDefaultOption()] };
    onChange(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, updates: Partial<QuizOption>) => {
    const updated = [...questions];
    const q = { ...updated[questionIndex] };
    const options = [...q.options];
    options[optionIndex] = { ...options[optionIndex], ...updates };

    // If marking as correct, unmark others
    if (updates.isCorrect) {
      options.forEach((o, i) => {
        if (i !== optionIndex) options[i] = { ...o, isCorrect: false };
      });
    }

    q.options = options;
    updated[questionIndex] = q;
    onChange(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    const q = { ...updated[questionIndex] };
    q.options = q.options.filter((_, i) => i !== optionIndex);
    updated[questionIndex] = q;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Quiz Questions</h3>

      {questions.map((question, qIndex) => (
        <div key={question.id} className="rounded border border-border bg-surface p-3 space-y-3">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Q{qIndex + 1} — {question.type === 'TRUE_FALSE' ? 'True/False' : 'Multiple Choice'}
            </span>
            <button
              onClick={() => removeQuestion(qIndex)}
              className="text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <input
            type="text"
            value={question.question}
            onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
            placeholder="Question text..."
            className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
          />

          <div className="space-y-1.5">
            {question.options.map((option, oIndex) => (
              <div key={option.id} className="flex items-center gap-2">
                <button
                  onClick={() => updateOption(qIndex, oIndex, { isCorrect: true })}
                  className={cn(
                    'flex-shrink-0',
                    option.isCorrect ? 'text-green-500' : 'text-muted-foreground/30 hover:text-green-300'
                  )}
                  title={option.isCorrect ? 'Correct answer' : 'Mark as correct'}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => updateOption(qIndex, oIndex, { text: e.target.value })}
                  placeholder={`Option ${oIndex + 1}...`}
                  className="flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
                  disabled={question.type === 'TRUE_FALSE'}
                />
                {question.type !== 'TRUE_FALSE' && question.options.length > 2 && (
                  <button
                    onClick={() => removeOption(qIndex, oIndex)}
                    className="text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {question.type === 'MULTIPLE_CHOICE' && question.options.length < 4 && (
            <button
              onClick={() => addOption(qIndex)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> Add option
            </button>
          )}

          <input
            type="text"
            value={question.explanation || ''}
            onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
            placeholder="Explanation (shown after answer)..."
            className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-muted-foreground placeholder:text-muted-foreground"
          />
        </div>
      ))}

      <div className="flex gap-2">
        <button
          onClick={() => addQuestion('MULTIPLE_CHOICE')}
          className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-surface-hover hover:text-foreground"
        >
          <Plus className="h-3 w-3" /> Multiple Choice
        </button>
        <button
          onClick={() => addQuestion('TRUE_FALSE')}
          className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-surface-hover hover:text-foreground"
        >
          <Plus className="h-3 w-3" /> True/False
        </button>
      </div>
    </div>
  );
}
