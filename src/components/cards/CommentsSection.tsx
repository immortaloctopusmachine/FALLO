'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Comment } from '@/types';

interface CommentsSectionProps {
  boardId: string;
  cardId: string;
  currentUserId?: string;
}

export function CommentsSection({ boardId, cardId, currentUserId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsFetching(true);
        const response = await fetch(`/api/boards/${boardId}/cards/${cardId}/comments`);
        if (!response.ok) {
          console.warn(`Failed to fetch comments: ${response.status}`);
          return;
        }
        const data = await response.json();
        if (data.success) {
          setComments(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch comments:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchComments();
  }, [boardId, cardId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/cards/${cardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setComments([...comments, data.data]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/comments/${commentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editContent.trim() }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setComments(comments.map((c) => (c.id === commentId ? data.data : c)));
        setEditingId(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Failed to edit comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/comments/${commentId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setComments(comments.filter((c) => c.id !== commentId));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
  };

  if (isFetching) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-md bg-surface-hover" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comments List */}
      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={comment.author.image || undefined} />
                <AvatarFallback className="text-xs">
                  {comment.author.name?.[0] || comment.author.email[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-body font-medium">
                    {comment.author.name || comment.author.email}
                  </span>
                  <span className="text-caption text-text-tertiary">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                  {comment.createdAt !== comment.updatedAt && (
                    <span className="text-caption text-text-tertiary">(edited)</span>
                  )}
                  {currentUserId === comment.author.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEditing(comment)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-error"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {editingId === comment.id ? (
                  <div className="mt-1 space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[60px] resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditComment(comment.id)}
                        disabled={isLoading || !editContent.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditing}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-0.5 text-body text-text-secondary whitespace-pre-wrap">
                    {comment.content}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {comments.length === 0 && (
        <p className="text-center text-caption text-text-tertiary py-4">
          No comments yet. Be the first to add one.
        </p>
      )}

      {/* New Comment Form */}
      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[80px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleAddComment();
            }
          }}
        />
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleAddComment}
          disabled={isLoading || !newComment.trim()}
        >
          <Send className="mr-2 h-4 w-4" />
          Comment
        </Button>
      </div>
    </div>
  );
}
