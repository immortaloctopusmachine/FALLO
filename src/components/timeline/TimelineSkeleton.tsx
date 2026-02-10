'use client';

export function TimelineSkeleton() {
  const blockWidths = [180, 240, 200, 260];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-6 w-24 animate-pulse rounded bg-surface-hover" />
          <div className="h-8 w-64 animate-pulse rounded bg-surface-hover" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 animate-pulse rounded bg-surface-hover" />
          <div className="h-8 w-20 animate-pulse rounded bg-surface-hover" />
          <div className="h-8 w-32 animate-pulse rounded bg-surface-hover" />
        </div>
      </div>

      {/* Timeline content area */}
      <div className="flex-1 flex">
        {/* Project names sidebar */}
        <div className="w-52 border-r border-border p-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-5 w-36 animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-24 animate-pulse rounded bg-surface-hover" />
            </div>
          ))}
        </div>

        {/* Grid area */}
        <div className="flex-1 p-4 space-y-3">
          {/* Date header */}
          <div className="flex gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="h-6 w-8 animate-pulse rounded bg-surface-hover" />
            ))}
          </div>

          {/* Block rows */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-1 items-center">
              <div
                className="h-10 animate-pulse rounded bg-surface-hover"
                style={{ width: `${blockWidths[i % blockWidths.length]}px` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
