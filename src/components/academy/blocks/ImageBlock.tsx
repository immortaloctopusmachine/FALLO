'use client';

import Image from 'next/image';
import type { ImageContentBlock } from '@/types/academy';

interface ImageBlockProps {
  block: ImageContentBlock;
}

export function ImageBlock({ block }: ImageBlockProps) {
  return (
    <figure className="my-4">
      <div className="relative overflow-hidden rounded-lg border bg-surface-hover">
        <Image
          src={block.url}
          alt={block.alt || ''}
          width={800}
          height={450}
          className="h-auto w-full object-contain"
          sizes="(max-width: 768px) 100vw, 800px"
        />
      </div>
      {block.caption && (
        <figcaption className="mt-1.5 text-center text-xs text-muted-foreground">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}
