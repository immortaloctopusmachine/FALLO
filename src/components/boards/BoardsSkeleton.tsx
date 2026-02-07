'use client';

export function BoardsSkeleton() {
  return (
    <main className="p-6 flex-1">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-6 w-40 animate-pulse rounded bg-surface-hover" />
        <div className="h-8 w-32 animate-pulse rounded bg-surface-hover" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-md bg-surface-hover" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-hover" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
              </div>
            </div>
            <div className="h-3 w-full animate-pulse rounded bg-surface-hover" />
          </div>
        ))}
      </div>
    </main>
  );
}
