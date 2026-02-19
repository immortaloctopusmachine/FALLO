'use client';

import { useState } from 'react';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Card, ReviewSubmissionData } from '@/types';
import { cn } from '@/lib/utils';

interface ReviewSubmissionDialogProps {
  isOpen: boolean;
  card: Card;
  boardId: string;
  onSubmit: () => void;
  onCancel: () => void;
}

const PLACEHOLDERS: Record<string, string> = {
  TASK: 'Describe what should be reviewed (e.g., art quality, animation, naming conventions)...',
  USER_STORY: 'Describe what should be reviewed (e.g., feature completeness, acceptance criteria)...',
  EPIC: 'Describe what should be reviewed (e.g., scope, overall progress)...',
  UTILITY: 'Describe what should be reviewed...',
};

export function ReviewSubmissionDialog({
  isOpen,
  card,
  boardId,
  onSubmit,
  onCancel,
}: ReviewSubmissionDialogProps) {
  const [reviewText, setReviewText] = useState('');
  const [visibleInEngine, setVisibleInEngine] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  const placeholder = PLACEHOLDERS[card.type] || PLACEHOLDERS.UTILITY;

  const handleSubmit = () => {
    if (!reviewText.trim() || isSubmitting) return;
    setIsSubmitting(true);

    const data: ReviewSubmissionData = {
      reviewText: reviewText.trim(),
      visibleInEngine,
      notes: notes.trim(),
    };

    // Fire the comment POST in the background — close the dialog immediately
    // so the user isn't waiting. The card move will also happen in the background.
    fetch(`/api/boards/${boardId}/cards/${card.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: JSON.stringify(data),
        type: 'review_submission',
      }),
    }).catch((error) => {
      console.error('Failed to submit review:', error);
    });

    onSubmit();
  };

  const handleSkip = () => {
    if (!showSkipWarning) {
      setShowSkipWarning(true);
      return;
    }
    onSubmit();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onCancel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Submission</DialogTitle>
          <DialogDescription>
            Moving &ldquo;{card.title}&rdquo; to Review
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="reviewText">
              What should be reviewed? <span className="text-error">*</span>
            </Label>
            <Textarea
              id="reviewText"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={placeholder}
              rows={3}
              autoFocus
            />
          </div>

          {/* Visible in Engine */}
          <div className="space-y-2">
            <Label>Can this asset be seen in engine?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={visibleInEngine === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVisibleInEngine(true)}
                className={cn(
                  'flex-1',
                  visibleInEngine === true && 'bg-green-600 hover:bg-green-700'
                )}
              >
                <Eye className="mr-2 h-4 w-4" />
                Yes
              </Button>
              <Button
                type="button"
                variant={visibleInEngine === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVisibleInEngine(false)}
                className={cn(
                  'flex-1',
                  visibleInEngine === false && 'bg-orange-600 hover:bg-orange-700'
                )}
              >
                <EyeOff className="mr-2 h-4 w-4" />
                No
              </Button>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="reviewNotes">Additional Notes (optional)</Label>
            <Textarea
              id="reviewNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra context for the reviewer..."
              rows={2}
            />
          </div>

          {/* Skip Warning */}
          {showSkipWarning && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <p className="text-caption text-warning">
                Reviewing something without context makes reviews harder and slower.
                Click skip again to confirm.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-text-tertiary"
            >
              {showSkipWarning ? 'Skip anyway' : 'Skip'}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reviewText.trim() || isSubmitting}
              size="sm"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
