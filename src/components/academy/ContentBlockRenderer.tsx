'use client';

import { TextBlock } from './blocks/TextBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { VideoBlock } from './blocks/VideoBlock';
import { AudioBlock } from './blocks/AudioBlock';
import type { ContentBlock } from '@/types/academy';

interface ContentBlockRendererProps {
  blocks: ContentBlock[];
}

export function ContentBlockRenderer({ blocks }: ContentBlockRendererProps) {
  if (blocks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No content yet.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {blocks.map((block) => {
        switch (block.type) {
          case 'TEXT':
            return <TextBlock key={block.id} block={block} />;
          case 'IMAGE':
            return <ImageBlock key={block.id} block={block} />;
          case 'VIDEO':
            return <VideoBlock key={block.id} block={block} />;
          case 'AUDIO':
            return <AudioBlock key={block.id} block={block} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
