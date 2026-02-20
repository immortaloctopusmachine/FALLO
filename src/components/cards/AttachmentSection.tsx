'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import {
  Paperclip,
  Upload,
  Trash2,
  FileText,
  FileImage,
  FileVideo,
  File,
  Download,
  MessageSquare,
  Send,
  Pencil,
  Check,
  X,
  ImageIcon,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Attachment, Comment } from '@/types';
import { cn } from '@/lib/utils';

interface AttachmentWithComments extends Attachment {
  comments: Comment[];
}

interface AttachmentSectionProps {
  boardId: string;
  cardId: string;
  onAttachmentCountChange?: (count: number) => void;
  onAttachmentsChange?: (attachments: Attachment[]) => void;
  highlightAttachmentId?: string | null;
  featureImageUrl?: string | null;
  onSetAsHeader?: (url: string) => void;
  initialAttachments?: AttachmentWithComments[];  // Pre-fetched via hover prefetch
}

// Module-level cache: show cached data instantly when reopening same card
const attachmentCache = new Map<string, AttachmentWithComments[]>();

const FILE_ICONS: Record<string, typeof File> = {
  'image/': FileImage,
  'video/': FileVideo,
  'application/pdf': FileText,
  'text/': FileText,
};

function getFileIcon(type: string) {
  for (const [prefix, Icon] of Object.entries(FILE_ICONS)) {
    if (type.startsWith(prefix)) return Icon;
  }
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(type: string): boolean {
  return type.startsWith('image/');
}

export function AttachmentSection({
  boardId,
  cardId,
  onAttachmentCountChange,
  onAttachmentsChange,
  highlightAttachmentId,
  featureImageUrl,
  onSetAsHeader,
  initialAttachments,
}: AttachmentSectionProps) {
  const cacheKey = `${boardId}:${cardId}`;
  const hasSeedData = initialAttachments !== undefined || attachmentCache.has(cacheKey);
  const [attachments, setAttachments] = useState<AttachmentWithComments[]>(
    () => initialAttachments ?? attachmentCache.get(cacheKey) ?? []
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(!hasSeedData);
  const [expandedAttachment, setExpandedAttachment] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [headerPromptUrl, setHeaderPromptUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Seed from prefetched data when it arrives after mount
  const prevInitialRef = useRef(initialAttachments);
  useEffect(() => {
    if (initialAttachments && initialAttachments !== prevInitialRef.current) {
      setAttachments(initialAttachments);
      attachmentCache.set(`${boardId}:${cardId}`, initialAttachments);
      onAttachmentCountChange?.(initialAttachments.length);
      onAttachmentsChange?.(initialAttachments);
      setIsFetching(false);
    }
    prevInitialRef.current = initialAttachments;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAttachments]);

  // Fetch attachments — show cached/prefetched data instantly, background refresh
  useEffect(() => {
    const key = `${boardId}:${cardId}`;
    const hasSeed = initialAttachments !== undefined || attachmentCache.has(key);
    if (!hasSeed) setIsFetching(true);

    fetch(`/api/boards/${boardId}/cards/${cardId}/attachments`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAttachments(data.data);
          attachmentCache.set(key, data.data);
          onAttachmentCountChange?.(data.data.length);
          onAttachmentsChange?.(data.data);
        }
      })
      .catch(error => console.error('Failed to fetch attachments:', error))
      .finally(() => setIsFetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, cardId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Upload file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'attachment');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadResponse.json();
        if (!uploadData.success) {
          console.error('Upload failed:', uploadData.error);
          continue;
        }

        // Create attachment record
        const attachmentResponse = await fetch(
          `/api/boards/${boardId}/cards/${cardId}/attachments`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: uploadData.data.name,
              url: uploadData.data.url,
              type: uploadData.data.type,
              size: uploadData.data.size,
            }),
          }
        );

        const attachmentData = await attachmentResponse.json();
        if (attachmentData.success) {
          setAttachments(prev => {
            const updated = [attachmentData.data, ...prev];
            onAttachmentCountChange?.(updated.length);
            onAttachmentsChange?.(updated);
            return updated;
          });

          // Prompt to set as header if it's an image and no header is set
          if (isImageType(uploadData.data.type) && !featureImageUrl && onSetAsHeader) {
            setHeaderPromptUrl(uploadData.data.url);
          }
        }
      }
    } catch (error) {
      console.error('Failed to upload:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = (attachmentId: string) => {
    // Optimistic: remove from UI immediately
    setAttachments(prev => {
      const updated = prev.filter(a => a.id !== attachmentId);
      onAttachmentCountChange?.(updated.length);
      onAttachmentsChange?.(updated);
      return updated;
    });

    // Fire-and-forget
    fetch(
      `/api/boards/${boardId}/cards/${cardId}/attachments/${attachmentId}`,
      { method: 'DELETE' }
    ).catch(error => console.error('Failed to delete attachment:', error));
  };

  const startRenaming = (attachment: AttachmentWithComments) => {
    setEditingAttachmentId(attachment.id);
    setEditingName(attachment.name);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const cancelRenaming = () => {
    setEditingAttachmentId(null);
    setEditingName('');
  };

  const handleRename = async (attachmentId: string) => {
    if (!editingName.trim() || isRenaming) return;

    setIsRenaming(true);
    try {
      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/attachments/${attachmentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editingName.trim() }),
        }
      );

      const data = await response.json();
      if (data.success) {
        const newAttachments = attachments.map((a) => (a.id === attachmentId ? data.data : a));
        setAttachments(newAttachments);
        setEditingAttachmentId(null);
        setEditingName('');
        onAttachmentsChange?.(newAttachments);
      }
    } catch (error) {
      console.error('Failed to rename attachment:', error);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleAddComment = async (attachmentId: string) => {
    if (!newComment.trim()) return;

    setIsAddingComment(true);
    try {
      const response = await fetch(`/api/boards/${boardId}/cards/${cardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
          attachmentId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === attachmentId
              ? { ...a, comments: [...a.comments, data.data] }
              : a
          )
        );
        setNewComment('');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsAddingComment(false);
    }
  };

  if (isFetching) {
    return (
      <div className="space-y-2">
        <div className="h-20 animate-pulse rounded-md bg-surface-hover" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Upload className="mr-2 h-4 w-4 animate-pulse" />
              Uploading...
            </>
          ) : (
            <>
              <Paperclip className="mr-2 h-4 w-4" />
              Add attachment
            </>
          )}
        </Button>
      </div>

      {/* Header image prompt */}
      {headerPromptUrl && onSetAsHeader && (
        <div className="flex items-center gap-2 rounded-md border border-card-task/30 bg-card-task/5 px-3 py-2">
          <ImageIcon className="h-4 w-4 shrink-0 text-card-task" />
          <span className="flex-1 text-caption text-text-secondary">
            Set as header image?
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-tiny text-card-task hover:bg-card-task/10"
            onClick={() => {
              onSetAsHeader(headerPromptUrl);
              setHeaderPromptUrl(null);
            }}
          >
            Yes
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-tiny text-text-tertiary"
            onClick={() => setHeaderPromptUrl(null)}
          >
            No
          </Button>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.type);
            const isImage = isImageType(attachment.type);
            const isExpanded = expandedAttachment === attachment.id;

            const isHighlighted = highlightAttachmentId === attachment.id;

            return (
              <div
                key={attachment.id}
                id={`attachment-${attachment.id}`}
                className={cn(
                  "rounded-md border bg-surface overflow-hidden transition-all duration-300",
                  isHighlighted
                    ? "border-card-task ring-2 ring-card-task/30"
                    : "border-border"
                )}
              >
                {/* Image Preview */}
                {isImage && (
                  <div className="relative group/image">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Image
                        src={attachment.url}
                        alt={attachment.name}
                        width={640}
                        height={256}
                        className="w-full max-h-40 object-cover hover:opacity-90 transition-opacity"
                      />
                    </a>
                    {/* Header image indicator or set button */}
                    {featureImageUrl === attachment.url ? (
                      <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-card-task px-2 py-1 text-white text-tiny font-medium">
                        <Star className="h-3 w-3 fill-current" />
                        Header
                      </div>
                    ) : onSetAsHeader && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity h-7 text-tiny"
                        onClick={() => onSetAsHeader(attachment.url)}
                      >
                        <ImageIcon className="mr-1 h-3 w-3" />
                        Set as header
                      </Button>
                    )}
                  </div>
                )}

                {/* File Info */}
                <div className="p-2 space-y-2">
                  {/* File name and info row */}
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 text-text-tertiary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      {editingAttachmentId === attachment.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            ref={renameInputRef}
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleRename(attachment.id);
                              } else if (e.key === 'Escape') {
                                cancelRenaming();
                              }
                            }}
                            className="h-7 text-body"
                            disabled={isRenaming}
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-success hover:text-success shrink-0"
                            onClick={() => handleRename(attachment.id)}
                            disabled={isRenaming || !editingName.trim()}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-text-tertiary hover:text-error shrink-0"
                            onClick={cancelRenaming}
                            disabled={isRenaming}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-body font-medium text-text-primary hover:underline line-clamp-2"
                          >
                            {attachment.name}
                          </a>
                          <p className="text-caption text-text-tertiary">
                            {formatFileSize(attachment.size)} • Added{' '}
                            {formatDistanceToNow(new Date(attachment.createdAt), {
                              addSuffix: true,
                            })}
                            {attachment.uploader && (
                              <> by {attachment.uploader.name || attachment.uploader.email}</>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action buttons row - separate from file info */}
                  {editingAttachmentId !== attachment.id && (
                    <div className="flex items-center gap-1 pt-1 border-t border-border-subtle">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-text-tertiary hover:text-text-primary text-tiny"
                        onClick={() => startRenaming(attachment)}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Rename
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="relative h-7 px-2 text-tiny"
                        onClick={() =>
                          setExpandedAttachment(isExpanded ? null : attachment.id)
                        }
                      >
                        <MessageSquare
                          className={cn(
                            'mr-1 h-3 w-3',
                            attachment.comments.length > 0
                              ? 'text-card-task'
                              : 'text-text-tertiary'
                          )}
                        />
                        <span className={attachment.comments.length > 0 ? 'text-card-task' : 'text-text-tertiary'}>
                          {attachment.comments.length || 'Comment'}
                        </span>
                      </Button>
                      <a
                        href={attachment.url}
                        download={attachment.name}
                        className="inline-flex h-7 px-2 items-center rounded-md text-text-tertiary hover:bg-surface-hover text-tiny"
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Download
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-text-tertiary hover:text-error text-tiny ml-auto"
                        onClick={() => handleDelete(attachment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Comments Section */}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-border space-y-2">
                      {attachment.comments.length > 0 && (
                        <div className="space-y-2">
                          {attachment.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-2">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={comment.author.image || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {comment.author.name?.[0] || comment.author.email[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-caption font-medium">
                                    {comment.author.name || comment.author.email}
                                  </span>
                                  <span className="text-caption text-text-tertiary">
                                    •{' '}
                                    {formatDistanceToNow(new Date(comment.createdAt), {
                                      addSuffix: true,
                                    })}
                                  </span>
                                </div>
                                <p className="text-caption text-text-secondary">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Comment */}
                      <div className="flex gap-2">
                        <Input
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="h-8 text-caption"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(attachment.id);
                            }
                          }}
                          disabled={isAddingComment}
                        />
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => handleAddComment(attachment.id)}
                          disabled={isAddingComment || !newComment.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {attachments.length === 0 && (
        <p className="text-center text-caption text-text-tertiary py-2">
          No attachments yet
        </p>
      )}
    </div>
  );
}
