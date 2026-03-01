'use client';

import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useAcademyMutations } from '@/hooks/api/use-academy';
import { ContentBlockEditor } from './ContentBlockEditor';
import { QuizEditor } from './QuizEditor';
import { RewardsPicker } from './RewardsPicker';
import type { AcademyTutorialDetail, ContentBlock, QuizQuestion, AcademyItemStatus, AcademyDifficulty } from '@/types/academy';

interface TutorialEditorProps {
  tutorial: AcademyTutorialDetail;
}

export function TutorialEditor({ tutorial }: TutorialEditorProps) {
  const mutations = useAcademyMutations();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(tutorial.title);
  const [description, setDescription] = useState(tutorial.description || '');
  const [coverImage, setCoverImage] = useState(tutorial.coverImage || '');
  const [creatorName, setCreatorName] = useState(tutorial.creatorName || '');
  const [creatorAvatar, setCreatorAvatar] = useState(tutorial.creatorAvatar || '');
  const [status, setStatus] = useState<AcademyItemStatus>(tutorial.status);
  const [difficulty, setDifficulty] = useState<AcademyDifficulty | ''>(tutorial.difficulty || '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(tutorial.estimatedMinutes ?? 0);
  const [passingScore, setPassingScore] = useState(tutorial.passingScore);
  const [coinsReward, setCoinsReward] = useState(tutorial.coinsReward);
  const [badgeDefinitionId, setBadgeDefinitionId] = useState(tutorial.badgeDefinitionId);
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(tutorial.contentBlocks);
  const [quiz, setQuiz] = useState<QuizQuestion[]>(tutorial.quiz);

  const handleSave = async () => {
    setSaving(true);
    try {
      await mutations.saveTutorial(tutorial.id, {
        title, description, coverImage: coverImage || null,
        creatorName: creatorName || null, creatorAvatar: creatorAvatar || null,
        status, difficulty: difficulty || null,
        estimatedMinutes: estimatedMinutes || null,
        passingScore, coinsReward,
        badgeDefinitionId,
        contentBlocks, quiz,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Edit Tutorial</h2>
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
          <input type="text" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground" placeholder="https://..." />
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
