'use client';

import type { VideoContentBlock } from '@/types/academy';

interface VideoBlockProps {
  block: VideoContentBlock;
}

export function VideoBlock({ block }: VideoBlockProps) {
  return (
    <figure className="my-4">
      <div className="relative overflow-hidden rounded-lg border bg-black">
        <video
          src={block.url}
          controls
          preload="metadata"
          className="w-full"
        >
          Your browser does not support the video tag.
        </video>
      </div>
      {block.caption && (
        <figcaption className="mt-1.5 text-center text-xs text-muted-foreground">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}
