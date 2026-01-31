'use client';

import { Paperclip } from 'lucide-react';
import type { Attachment } from '@/types';

interface CommentContentProps {
  content: string;
  attachments: Attachment[];
  onAttachmentClick?: (attachment: Attachment) => void;
}

// Parse comment content and render attachment references as clickable links
// Format: @[attachment-name] or @[attachment-id]
export function CommentContent({
  content,
  attachments,
  onAttachmentClick,
}: CommentContentProps) {
  // Regex to match @[...] patterns
  const attachmentRefRegex = /@\[([^\]]+)\]/g;

  // Build a map of attachment names and IDs for quick lookup
  const attachmentByName = new Map<string, Attachment>();
  const attachmentById = new Map<string, Attachment>();

  attachments.forEach((att) => {
    attachmentByName.set(att.name.toLowerCase(), att);
    attachmentById.set(att.id, att);
  });

  // Find an attachment by reference (name or ID)
  const findAttachment = (ref: string): Attachment | undefined => {
    // Try by ID first
    const byId = attachmentById.get(ref);
    if (byId) return byId;

    // Try by name (case-insensitive)
    return attachmentByName.get(ref.toLowerCase());
  };

  // Split content into parts: text and attachment references
  const parts: Array<{ type: 'text' | 'attachment'; content: string; attachment?: Attachment }> = [];
  let lastIndex = 0;
  let match;

  while ((match = attachmentRefRegex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      });
    }

    // Add the attachment reference
    const ref = match[1];
    const attachment = findAttachment(ref);

    parts.push({
      type: 'attachment',
      content: ref,
      attachment,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  // If no attachment references found, just render the content
  if (parts.length === 0) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        }

        // Render attachment reference
        if (part.attachment) {
          return (
            <button
              key={index}
              onClick={() => onAttachmentClick?.(part.attachment!)}
              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-card-task/10 text-card-task hover:bg-card-task/20 transition-colors text-caption font-medium"
              title={`View attachment: ${part.attachment.name}`}
            >
              <Paperclip className="h-3 w-3" />
              {part.attachment.name}
            </button>
          );
        }

        // Attachment not found - render as plain text with warning style
        return (
          <span
            key={index}
            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-surface-hover text-text-tertiary text-caption"
            title="Attachment not found"
          >
            <Paperclip className="h-3 w-3" />
            {part.content}
          </span>
        );
      })}
    </span>
  );
}
