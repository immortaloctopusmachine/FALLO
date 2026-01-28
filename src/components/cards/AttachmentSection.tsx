'use client';

import { useState, useEffect, useRef } from 'react';
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
}

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
}: AttachmentSectionProps) {
  const [attachments, setAttachments] = useState<AttachmentWithComments[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [expandedAttachment, setExpandedAttachment] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        setIsFetching(true);
        const response = await fetch(`/api/boards/${boardId}/cards/${cardId}/attachments`);
        const data = await response.json();
        if (data.success) {
          setAttachments(data.data);
          onAttachmentCountChange?.(data.data.length);
        }
      } catch (error) {
        console.error('Failed to fetch attachments:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchAttachments();
  }, [boardId, cardId, onAttachmentCountChange]);

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
          setAttachments((prev) => [attachmentData.data, ...prev]);
          onAttachmentCountChange?.(attachments.length + 1);
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

  const handleDelete = async (attachmentId: string) => {
    try {
      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/attachments/${attachmentId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        onAttachmentCountChange?.(attachments.length - 1);
      }
    } catch (error) {
      console.error('Failed to delete attachment:', error);
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

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.type);
            const isImage = isImageType(attachment.type);
            const isExpanded = expandedAttachment === attachment.id;

            return (
              <div
                key={attachment.id}
                className="rounded-md border border-border bg-surface overflow-hidden"
              >
                {/* Image Preview */}
                {isImage && (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-full max-h-40 object-cover hover:opacity-90 transition-opacity"
                    />
                  </a>
                )}

                {/* File Info */}
                <div className="p-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-text-tertiary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-body font-medium text-text-primary hover:underline truncate block"
                      >
                        {attachment.name}
                      </a>
                      <p className="text-caption text-text-tertiary">
                        {formatFileSize(attachment.size)} • Added{' '}
                        {formatDistanceToNow(new Date(attachment.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          setExpandedAttachment(isExpanded ? null : attachment.id)
                        }
                      >
                        <MessageSquare
                          className={cn(
                            'h-4 w-4',
                            attachment.comments.length > 0
                              ? 'text-card-task'
                              : 'text-text-tertiary'
                          )}
                        />
                      </Button>
                      <a
                        href={attachment.url}
                        download={attachment.name}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-surface-hover"
                      >
                        <Download className="h-4 w-4 text-text-tertiary" />
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-text-tertiary hover:text-error"
                        onClick={() => handleDelete(attachment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

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
