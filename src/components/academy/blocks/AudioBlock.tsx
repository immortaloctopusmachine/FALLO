'use client';

import { Volume2 } from 'lucide-react';
import type { AudioContentBlock } from '@/types/academy';

interface AudioBlockProps {
  block: AudioContentBlock;
}

export function AudioBlock({ block }: AudioBlockProps) {
  return (
    <figure className="my-4">
      <div className="flex items-center gap-3 rounded-lg border bg-surface-hover p-3">
        <Volume2 className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
        <audio src={block.url} controls preload="metadata" className="flex-1">
          Your browser does not support the audio tag.
        </audio>
      </div>
      {block.caption && (
        <figcaption className="mt-1.5 text-center text-xs text-muted-foreground">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}
