'use client';

import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useAcademyMutations } from '@/hooks/api/use-academy';
import { ContentBlockEditor } from './ContentBlockEditor';
import { QuizEditor } from './QuizEditor';
import type { AcademyLessonDetail, ContentBlock, QuizQuestion } from '@/types/academy';

interface LessonEditorProps {
  lesson: AcademyLessonDetail;
}

export function LessonEditor({ lesson }: LessonEditorProps) {
  const mutations = useAcademyMutations();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description || '');
  const [passingScore, setPassingScore] = useState(lesson.passingScore);
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(lesson.contentBlocks);
  const [quiz, setQuiz] = useState<QuizQuestion[]>(lesson.quiz);

  const handleSave = async () => {
    setSaving(true);
    try {
      await mutations.saveLesson(lesson.courseId, lesson.id, {
        title, description,
        passingScore, contentBlocks, quiz,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Edit Lesson</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      {/* Metadata */}
      <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground" rows={2} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Passing Score (%)</label>
          <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground" />
        </div>
      </div>

      {/* Content */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-semibold">Content Blocks</h3>
        <ContentBlockEditor blocks={contentBlocks} onChange={setContentBlocks} />
      </div>

      {/* Quiz */}
      <div className="rounded-lg border p-4">
        <QuizEditor questions={quiz} onChange={setQuiz} />
      </div>
    </div>
  );
}
