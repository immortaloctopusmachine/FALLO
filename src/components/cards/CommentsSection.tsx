'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send, MoreHorizontal, Trash2, Pencil, Paperclip, User, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CommentContent } from './CommentContent';
import { ReviewSubmissionComment } from './ReviewSubmissionComment';
import type { Comment, Attachment, User as UserType } from '@/types';
import { cn } from '@/lib/utils';

interface BoardMember {
  id: string;
  user: UserType;
}

interface MentionSuggestion {
  type: 'attachment' | 'user';
  id: string;
  name: string;
  image?: string | null;
}

interface CommentsSectionProps {
  boardId: string;
  cardId: string;
  currentUserId?: string;
  attachments?: Attachment[];
  onAttachmentClick?: (attachment: Attachment) => void;
}

export function CommentsSection({
  boardId,
  cardId,
  currentUserId,
  attachments = [],
  onAttachmentClick,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);

  // Mention autocomplete state
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionPickerRef = useRef<HTMLDivElement>(null);

  // Fetch comments
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

  // Fetch board members for @mentions
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch(`/api/boards/${boardId}/members`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setBoardMembers(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch board members:', error);
      }
    };

    fetchMembers();
  }, [boardId]);

  // Build mention suggestions based on query
  const mentionSuggestions = useMemo((): MentionSuggestion[] => {
    const query = mentionQuery.toLowerCase();
    const suggestions: MentionSuggestion[] = [];

    // Add matching attachments
    attachments.forEach((att) => {
      if (att.name.toLowerCase().includes(query)) {
        suggestions.push({
          type: 'attachment',
          id: att.id,
          name: att.name,
        });
      }
    });

    // Add matching users
    boardMembers.forEach((member) => {
      const userName = member.user.name || member.user.email;
      if (userName.toLowerCase().includes(query)) {
        suggestions.push({
          type: 'user',
          id: member.user.id,
          name: member.user.name || member.user.email,
          image: member.user.image,
        });
      }
    });

    return suggestions.slice(0, 8); // Limit to 8 suggestions
  }, [mentionQuery, attachments, boardMembers]);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [mentionSuggestions]);

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

  const handleReply = (comment: Comment) => {
    // Extract mentioned users from the comment being replied to
    // Pattern: @username (for users)
    const userMentionRegex = /@(\w+(?:\s+\w+)*?)(?=\s|$|@|\[)/g;
    const mentionedUsers = new Set<string>();

    let match;
    while ((match = userMentionRegex.exec(comment.content)) !== null) {
      mentionedUsers.add(match[1]);
    }

    // Always add the comment author
    const authorName = comment.author.name || comment.author.email;
    mentionedUsers.add(authorName);

    // Build the reply prefix with all mentioned users
    const mentions = Array.from(mentionedUsers)
      .map(name => `@${name}`)
      .join(' ');

    setNewComment(mentions + ' ');

    // Focus the textarea and move cursor to end
    setTimeout(() => {
      textareaRef.current?.focus();
      const length = mentions.length + 1;
      textareaRef.current?.setSelectionRange(length, length);
    }, 0);
  };

  const insertMention = useCallback((suggestion: MentionSuggestion) => {
    const textarea = textareaRef.current;
    if (!textarea || mentionStartPos === null) return;

    // For attachments, use @[name], for users use @name
    const mentionText = suggestion.type === 'attachment'
      ? `@[${suggestion.name}]`
      : `@${suggestion.name}`;

    const beforeMention = newComment.slice(0, mentionStartPos);
    const afterMention = newComment.slice(textarea.selectionStart);
    const newValue = beforeMention + mentionText + ' ' + afterMention;

    setNewComment(newValue);
    setShowMentionPicker(false);
    setMentionQuery('');
    setMentionStartPos(null);

    // Move cursor after the inserted mention
    const newCursorPos = mentionStartPos + mentionText.length + 1;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [newComment, mentionStartPos]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewComment(value);

    // Check if we should show the mention picker
    // Look for @ symbol before cursor that starts a mention
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if @ is at start or preceded by whitespace
      const charBeforeAt = textBeforeCursor[lastAtIndex - 1];
      const isValidMentionStart = lastAtIndex === 0 || /\s/.test(charBeforeAt);

      if (isValidMentionStart) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        // Only show picker if query doesn't contain whitespace (except for [])
        // and doesn't already have a completed @[...] pattern
        const hasClosedBracket = query.includes(']');
        const hasSpace = /\s/.test(query.replace(/\[.*?\]/g, ''));

        if (!hasClosedBracket && !hasSpace) {
          setMentionStartPos(lastAtIndex);
          // Remove leading [ if present (user started typing @[)
          setMentionQuery(query.replace(/^\[/, ''));
          setShowMentionPicker(true);
          return;
        }
      }
    }

    // Hide picker if no valid mention context
    setShowMentionPicker(false);
    setMentionStartPos(null);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionPicker && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < mentionSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev > 0 ? prev - 1 : mentionSuggestions.length - 1
        );
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionSuggestions[selectedMentionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionPicker(false);
        setMentionStartPos(null);
      }
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAddComment();
    }
  };

  // Close mention picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mentionPickerRef.current &&
        !mentionPickerRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowMentionPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            comment.type === 'review_submission' ? (
              <ReviewSubmissionComment key={comment.id} comment={comment} />
            ) : (
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
                  <>
                    <p className="mt-0.5 text-body text-text-secondary">
                      <CommentContent
                        content={comment.content}
                        attachments={attachments}
                        onAttachmentClick={onAttachmentClick}
                      />
                    </p>
                    <button
                      onClick={() => handleReply(comment)}
                      className="mt-1 flex items-center gap-1 text-tiny text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      <Reply className="h-3 w-3" />
                      Reply
                    </button>
                  </>
                )}
              </div>
            </div>
            )
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
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={newComment}
          onChange={handleTextareaChange}
          onKeyDown={handleTextareaKeyDown}
          placeholder="Write a comment... Type @ to mention attachments or users"
          className="min-h-[80px] resize-none"
        />

        {/* Mention Autocomplete Picker */}
        {showMentionPicker && mentionSuggestions.length > 0 && (
          <div
            ref={mentionPickerRef}
            className="absolute left-0 bottom-full mb-1 z-10 w-72 max-h-64 overflow-y-auto rounded-md border border-border bg-surface shadow-lg"
          >
            <div className="py-1">
              {mentionSuggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.id}`}
                  onClick={() => insertMention(suggestion)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 text-left transition-colors",
                    index === selectedMentionIndex
                      ? "bg-surface-hover"
                      : "hover:bg-surface-hover"
                  )}
                >
                  {suggestion.type === 'attachment' ? (
                    <Paperclip className="h-4 w-4 text-card-task shrink-0" />
                  ) : (
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarImage src={suggestion.image || undefined} />
                      <AvatarFallback className="text-[10px]">
                        <User className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-body truncate block">{suggestion.name}</span>
                    <span className="text-tiny text-text-tertiary">
                      {suggestion.type === 'attachment' ? 'Attachment' : 'User'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No matches message */}
        {showMentionPicker && mentionSuggestions.length === 0 && mentionQuery.length > 0 && (
          <div
            ref={mentionPickerRef}
            className="absolute left-0 bottom-full mb-1 z-10 w-72 rounded-md border border-border bg-surface shadow-lg"
          >
            <p className="px-3 py-2 text-caption text-text-tertiary">
              No matching attachments or users
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-tiny text-text-tertiary">
          Type @ to mention attachments or users
        </p>
        <Button
          size="sm"
          onClick={handleAddComment}
          disabled={isLoading || !newComment.trim()}
          className="ml-auto"
        >
          <Send className="mr-2 h-4 w-4" />
          Comment
        </Button>
      </div>
    </div>
  );
}
