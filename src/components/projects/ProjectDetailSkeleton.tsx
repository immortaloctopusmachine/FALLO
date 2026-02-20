export function ProjectDetailSkeleton() {
  return (
    <main className="flex-1">
      {/* Banner skeleton */}
      <div className="h-[140px] w-full animate-pulse bg-surface-hover" />

      {/* Stats bar skeleton */}
      <div className="border-b border-border bg-surface px-6 py-3">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 max-w-6xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-hover" />
          ))}
        </div>
      </div>

      {/* Team + members bar skeleton */}
      <div className="border-b border-border bg-surface px-6 py-2.5">
        <div className="flex items-center justify-between max-w-6xl">
          <div className="h-8 w-48 animate-pulse rounded bg-surface-hover" />
          <div className="flex -space-x-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-7 w-7 animate-pulse rounded-full bg-surface-hover border-2 border-surface" />
            ))}
          </div>
        </div>
      </div>

      {/* Three-column skeleton */}
      <div className="max-w-6xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <div className="h-5 w-24 animate-pulse rounded bg-surface-hover" />
            <div className="rounded-lg border border-border p-4 space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded bg-surface-hover" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-5 w-24 animate-pulse rounded bg-surface-hover" />
            <div className="h-20 animate-pulse rounded-lg bg-surface-hover" />
            <div className="h-5 w-32 animate-pulse rounded bg-surface-hover" />
            <div className="rounded-lg border border-border p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded bg-surface-hover" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-5 w-16 animate-pulse rounded bg-surface-hover" />
            <div className="rounded-lg border border-border p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded bg-surface-hover" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
