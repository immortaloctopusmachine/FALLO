export function StudioDetailSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header Banner */}
      <div className="h-32 animate-pulse bg-surface-hover" />

      <div className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 -mt-12 animate-pulse rounded-xl bg-surface-hover border-4 border-surface" />
            <div className="space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
              <div className="h-6 w-40 animate-pulse rounded bg-surface-hover" />
              <div className="h-4 w-64 animate-pulse rounded bg-surface-hover" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-6">
          <div className="h-4 w-20 animate-pulse rounded bg-surface-hover" />
          <div className="h-4 w-24 animate-pulse rounded bg-surface-hover" />
        </div>
      </div>

      <main className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-5 w-24 animate-pulse rounded bg-surface-hover" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-surface p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-md bg-surface-hover" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-24 animate-pulse rounded bg-surface-hover" />
                  <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
