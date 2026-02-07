'use client';

export function BoardSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Board header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-6 w-40 animate-pulse rounded bg-surface-hover" />
          <div className="h-5 w-24 animate-pulse rounded bg-surface-hover" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded bg-surface-hover" />
          <div className="h-8 w-8 animate-pulse rounded bg-surface-hover" />
          <div className="h-8 w-8 animate-pulse rounded bg-surface-hover" />
        </div>
      </div>

      {/* Board columns */}
      <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="w-72 shrink-0 rounded-lg border border-border bg-surface p-3 space-y-3"
          >
            {/* List header */}
            <div className="flex items-center justify-between">
              <div className="h-5 w-28 animate-pulse rounded bg-surface-hover" />
              <div className="h-5 w-6 animate-pulse rounded bg-surface-hover" />
            </div>

            {/* Card placeholders */}
            {Array.from({ length: 2 + Math.floor(Math.random() * 3) }).map((_, j) => (
              <div
                key={j}
                className="rounded-md border border-border bg-background p-3 space-y-2"
              >
                <div className="h-4 w-full animate-pulse rounded bg-surface-hover" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-surface-hover" />
                <div className="flex gap-1">
                  <div className="h-5 w-5 animate-pulse rounded-full bg-surface-hover" />
                  <div className="h-5 w-5 animate-pulse rounded-full bg-surface-hover" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
