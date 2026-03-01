'use client';

import type { TextContentBlock } from '@/types/academy';

interface TextBlockProps {
  block: TextContentBlock;
}

export function TextBlock({ block }: TextBlockProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      {/* Render markdown as plain text with basic formatting */}
      {block.content.split('\n').map((line, i) => {
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-base font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <li key={i} className="ml-4 list-disc text-sm text-foreground/90">
              {renderInline(line.slice(2))}
            </li>
          );
        }
        if (line.trim() === '') {
          return <div key={i} className="h-2" />;
        }
        return <p key={i} className="text-sm text-foreground/90 leading-relaxed">{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  // Simple bold/italic rendering
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/\*(.+?)\*/);

    if (boldMatch && boldMatch.index !== undefined && (!italicMatch || boldMatch.index <= (italicMatch.index ?? Infinity))) {
      if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index));
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0) parts.push(remaining.slice(0, italicMatch.index));
      parts.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
