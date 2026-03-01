'use client';

export function AcademySkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-hover" />
        <div className="h-8 w-32 animate-pulse rounded bg-surface-hover" />
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-surface-hover" />
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-3 space-y-3">
            <div className="h-32 w-full animate-pulse rounded bg-surface-hover" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-surface-hover" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
            <div className="flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded-full bg-surface-hover" />
              <div className="h-5 w-12 animate-pulse rounded-full bg-surface-hover" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
