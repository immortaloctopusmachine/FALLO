'use client';

import { useState } from 'react';
import { Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAcademyMutations } from '@/hooks/api/use-academy';
import { QuizEditor } from './QuizEditor';
import { RewardsPicker } from './RewardsPicker';
import type { AcademyCourseDetail, QuizQuestion, AcademyItemStatus, AcademyDifficulty } from '@/types/academy';

interface CourseEditorProps {
  course: AcademyCourseDetail;
}

export function CourseEditor({ course }: CourseEditorProps) {
  const mutations = useAcademyMutations();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || '');
  const [coverImage, setCoverImage] = useState(course.coverImage || '');
  const [creatorName, setCreatorName] = useState(course.creatorName || '');
  const [creatorAvatar, setCreatorAvatar] = useState(course.creatorAvatar || '');
  const [status, setStatus] = useState<AcademyItemStatus>(course.status);
  const [difficulty, setDifficulty] = useState<AcademyDifficulty | ''>(course.difficulty || '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(course.estimatedMinutes ?? 0);
  const [passingScore, setPassingScore] = useState(course.passingScore);
  const [enforceOrder, setEnforceOrder] = useState(course.enforceOrder);
  const [coinsReward, setCoinsReward] = useState(course.coinsReward);
  const [badgeDefinitionId, setBadgeDefinitionId] = useState(course.badgeDefinitionId);
  const [finalQuiz, setFinalQuiz] = useState<QuizQuestion[]>(course.finalQuiz);
  const [newLessonTitle, setNewLessonTitle] = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      await mutations.saveCourse(course.id, {
        title, description, coverImage: coverImage || null,
        creatorName: creatorName || null, creatorAvatar: creatorAvatar || null,
        status, difficulty: difficulty || null,
        estimatedMinutes: estimatedMinutes || null,
        passingScore, enforceOrder,
        coinsReward, badgeDefinitionId,
        finalQuiz,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddLesson = async () => {
    if (!newLessonTitle.trim()) return;
    await mutations.createLesson(course.id, { title: newLessonTitle.trim() });
    setNewLessonTitle('');
  };

  const handleDeleteLesson = async (lessonId: string) => {
    await mutations.deleteLesson(course.id, lessonId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Edit Course</h2>
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
        <div>
          <label className="text-xs font-medium text-muted-foreground">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as AcademyItemStatus)} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground" rows={2} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Cover Image URL</label>
          <input type="text" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as AcademyDifficulty | '')} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground">
            <option value="">None</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Creator Name</label>
          <input type="text" value={creatorName} onChange={(e) => setCreatorName(e.target.value)} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Creator Avatar URL</label>
          <input type="text" value={creatorAvatar} onChange={(e) => setCreatorAvatar(e.target.value)} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Estimated Minutes</label>
          <input type="number" min={0} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 0)} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Passing Score (%)</label>
          <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="enforceOrder" checked={enforceOrder} onChange={(e) => setEnforceOrder(e.target.checked)} />
          <label htmlFor="enforceOrder" className="text-xs font-medium text-muted-foreground">Enforce sequential lesson order</label>
        </div>
      </div>

      {/* Rewards */}
      <div className="rounded-lg border p-4">
        <RewardsPicker
          coinsReward={coinsReward}
          badgeDefinitionId={badgeDefinitionId}
          onCoinsChange={setCoinsReward}
          onBadgeChange={setBadgeDefinitionId}
        />
      </div>

      {/* Lesson management */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Lessons ({course.lessons.length})</h3>

        <div className="space-y-1">
          {course.lessons.map((lesson, i) => (
            <div key={lesson.id} className="flex items-center gap-2 rounded bg-surface-hover px-3 py-2">
              <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
              <a
                href={`/academy/courses/${course.id}/lessons/${lesson.id}`}
                className="flex-1 text-sm hover:text-primary"
              >
                {lesson.title}
              </a>
              <button
                onClick={() => handleDeleteLesson(lesson.id)}
                className="text-muted-foreground hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newLessonTitle}
            onChange={(e) => setNewLessonTitle(e.target.value)}
            placeholder="New lesson title..."
            className="flex-1 rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddLesson(); }}
          />
          <button
            onClick={handleAddLesson}
            className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3 w-3" /> Add Lesson
          </button>
        </div>
      </div>

      {/* Final quiz */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-1 text-sm font-semibold">Final Course Quiz</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Students must complete all lesson quizzes before taking this final quiz.
        </p>
        <QuizEditor questions={finalQuiz} onChange={setFinalQuiz} />
      </div>
    </div>
  );
}
