export function ProjectsSkeleton() {
  return (
    <main className="p-6 flex-1">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-6 w-36 animate-pulse rounded bg-surface-hover" />
        <div className="h-8 w-32 animate-pulse rounded bg-surface-hover" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface overflow-hidden"
          >
            {/* Name header skeleton */}
            <div className="px-4 pt-3 pb-2">
              <div className="h-5 w-3/4 animate-pulse rounded bg-surface-hover" />
            </div>
            {/* Team bar skeleton */}
            <div className="h-7 animate-pulse bg-surface-hover" />
            {/* Roles skeleton */}
            <div className="px-4 py-2 space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
            </div>
            {/* Sparkline skeleton */}
            <div className="px-4 pb-2">
              <div className="h-9 animate-pulse rounded bg-surface-hover" />
            </div>
            {/* Dates skeleton */}
            <div className="px-4 pb-3 flex gap-3">
              <div className="h-3 w-24 animate-pulse rounded bg-surface-hover" />
              <div className="h-3 w-24 animate-pulse rounded bg-surface-hover" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
