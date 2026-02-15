'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReviewQuestion {
  id: string;
  name: string;
  description: string | null;
  position: number;
  isActive: boolean;
  audience: 'LEAD' | 'PO' | 'BOTH';
}

interface ReviewQuestionsResponse {
  scoringOptions: string[];
  questions: ReviewQuestion[];
}

interface NewQuestionForm {
  name: string;
  description: string;
  audience: 'LEAD' | 'PO' | 'BOTH';
  isActive: boolean;
}

const DEFAULT_NEW_FORM: NewQuestionForm = {
  name: '',
  description: '',
  audience: 'BOTH',
  isActive: true,
};

export function ReviewQuestionsSettingsClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [scoringOptions, setScoringOptions] = useState<string[]>([]);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState<NewQuestionForm>(DEFAULT_NEW_FORM);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const questionsRes = await fetch('/api/review-questions');
      const questionsJson = await questionsRes.json();

      if (!questionsRes.ok || !questionsJson.success) {
        throw new Error(questionsJson.error?.message || 'Failed to load review questions');
      }

      const questionsData = questionsJson.data as ReviewQuestionsResponse;
      setScoringOptions(questionsData.scoringOptions);
      setQuestions(questionsData.questions);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load settings';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const questionIdsInOrder = useMemo(() => questions.map((question) => question.id), [questions]);

  const updateQuestionLocal = (questionId: string, updater: (current: ReviewQuestion) => ReviewQuestion) => {
    setQuestions((prev) => prev.map((question) => (question.id === questionId ? updater(question) : question)));
  };

  const handleCreate = async () => {
    if (!newQuestion.name.trim()) {
      alert('Question name is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/review-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newQuestion.name,
          description: newQuestion.description || null,
          audience: newQuestion.audience,
          isActive: newQuestion.isActive,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to create question');
      }

      setQuestions((prev) => [...prev, data.data as ReviewQuestion].sort((a, b) => a.position - b.position));
      setNewQuestion(DEFAULT_NEW_FORM);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to create question';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDetails = async (question: ReviewQuestion) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/review-questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: question.name,
          description: question.description,
          isActive: question.isActive,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update question');
      }
      updateQuestionLocal(question.id, () => data.data as ReviewQuestion);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to update question';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAudience = async (question: ReviewQuestion) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/review-questions/${question.id}/audience`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience: question.audience }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update audience');
      }
      updateQuestionLocal(question.id, () => data.data as ReviewQuestion);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to update audience';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('Delete (deactivate) this review question?')) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/review-questions/${questionId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to delete question');
      }
      setQuestions((prev) => prev.filter((question) => question.id !== questionId));
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to delete question';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReorder = async (questionId: string, direction: 'up' | 'down') => {
    const currentIndex = questionIdsInOrder.findIndex((id) => id === questionId);
    if (currentIndex < 0) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= questionIdsInOrder.length) return;

    const reordered = [...questionIdsInOrder];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    setIsSaving(true);
    try {
      const response = await fetch('/api/review-questions/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: reordered }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to reorder questions');
      }

      const ordered = (data.data.questions as ReviewQuestion[]).sort((a, b) => a.position - b.position);
      setQuestions(ordered);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to reorder questions';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-text-secondary">Loading review questions...</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-title font-semibold">Quality Review Questions</h2>
        <p className="mt-1 text-body text-text-secondary">
          Super Admin only. Configure evaluation questions and scoring audience.
        </p>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface p-4">
        <h3 className="text-body font-semibold">Scoring Options (fixed)</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {scoringOptions.map((option) => (
            <span key={option} className="rounded-full border border-border-subtle bg-background px-2 py-1 text-caption">
              {option}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface p-4 space-y-3">
        <h3 className="text-body font-semibold">Add Review Question</h3>
        <Input
          value={newQuestion.name}
          onChange={(event) => setNewQuestion((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="Question name"
        />
        <Textarea
          value={newQuestion.description}
          onChange={(event) => setNewQuestion((prev) => ({ ...prev, description: event.target.value }))}
          rows={2}
          placeholder="Description (optional)"
        />

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <div className="text-caption text-text-secondary">Audience</div>
            <Select
              value={newQuestion.audience}
              onValueChange={(value: 'LEAD' | 'PO' | 'BOTH') =>
                setNewQuestion((prev) => ({ ...prev, audience: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LEAD">Lead</SelectItem>
                <SelectItem value="PO">PO</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-caption text-text-secondary">
          <input
            type="checkbox"
            checked={newQuestion.isActive}
            onChange={(event) => setNewQuestion((prev) => ({ ...prev, isActive: event.target.checked }))}
          />
          Active
        </label>

        <div className="flex justify-end">
          <Button onClick={handleCreate} disabled={isSaving || !newQuestion.name.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {questions
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((question, index, sortedQuestions) => (
            <div key={question.id} className="rounded-lg border border-border-subtle bg-surface p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="text-caption text-text-tertiary">Position #{question.position}</div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReorder(question.id, 'up')}
                    disabled={isSaving || index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReorder(question.id, 'down')}
                    disabled={isSaving || index === sortedQuestions.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error hover:bg-error/10 hover:text-error"
                    onClick={() => handleDelete(question.id)}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Input
                value={question.name}
                onChange={(event) =>
                  updateQuestionLocal(question.id, (current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Question name"
              />

              <Textarea
                value={question.description || ''}
                onChange={(event) =>
                  updateQuestionLocal(question.id, (current) => ({
                    ...current,
                    description: event.target.value || null,
                  }))
                }
                rows={2}
                placeholder="Description"
              />

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-caption text-text-secondary">Audience</div>
                  <Select
                    value={question.audience}
                    onValueChange={(value: 'LEAD' | 'PO' | 'BOTH') => {
                      updateQuestionLocal(question.id, (current) => ({
                        ...current,
                        audience: value,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEAD">Lead</SelectItem>
                      <SelectItem value="PO">PO</SelectItem>
                      <SelectItem value="BOTH">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-caption text-text-secondary">
                <input
                  type="checkbox"
                  checked={question.isActive}
                  onChange={(event) =>
                    updateQuestionLocal(question.id, (current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                />
                Active
              </label>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => handleSaveDetails(question)} disabled={isSaving}>
                  Save Details
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleSaveAudience(question)} disabled={isSaving}>
                  Save Audience
                </Button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
