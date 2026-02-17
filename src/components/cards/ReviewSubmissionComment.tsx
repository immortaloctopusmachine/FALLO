'use client';

import { formatDistanceToNow } from 'date-fns';
import { Search, Eye, EyeOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Comment, ReviewSubmissionData } from '@/types';

interface ReviewSubmissionCommentProps {
  comment: Comment;
}

function parseReviewData(content: string): ReviewSubmissionData | null {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null && 'reviewText' in parsed) {
      return parsed as ReviewSubmissionData;
    }
    return null;
  } catch {
    return null;
  }
}

export function ReviewSubmissionComment({ comment }: ReviewSubmissionCommentProps) {
  const data = parseReviewData(comment.content);

  if (!data) {
    return (
      <div className="rounded-lg border border-border p-3">
        <p className="text-caption text-text-tertiary">Invalid review submission data</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-l-4 border-l-purple-500 border border-purple-500/20 bg-purple-500/5 p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-4 w-4 text-purple-500" />
        <span className="text-caption font-semibold text-purple-500">Review Submission</span>
        <span className="text-caption text-text-tertiary">·</span>
        <Avatar className="h-5 w-5">
          <AvatarImage src={comment.author.image || undefined} />
          <AvatarFallback className="text-[8px]">
            {(comment.author.name || comment.author.email)[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-caption text-text-secondary">
          {comment.author.name || comment.author.email}
        </span>
        <span className="text-caption text-text-tertiary">·</span>
        <span className="text-caption text-text-tertiary">
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Review Text */}
      <div className="mb-2">
        <p className="text-tiny font-medium text-text-tertiary uppercase tracking-wide mb-1">
          What to review
        </p>
        <p className="text-body text-text-primary">{data.reviewText}</p>
      </div>

      {/* Visible in Engine */}
      {data.visibleInEngine !== null && (
        <div className="mb-2 flex items-center gap-2">
          <p className="text-tiny font-medium text-text-tertiary uppercase tracking-wide">
            Visible in engine
          </p>
          {data.visibleInEngine ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-tiny font-medium text-green-600">
              <Eye className="h-3 w-3" />
              Yes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-tiny font-medium text-orange-600">
              <EyeOff className="h-3 w-3" />
              No
            </span>
          )}
        </div>
      )}

      {/* Notes */}
      {data.notes && (
        <div>
          <p className="text-tiny font-medium text-text-tertiary uppercase tracking-wide mb-1">
            Notes
          </p>
          <p className="text-caption text-text-secondary">{data.notes}</p>
        </div>
      )}
    </div>
  );
}
