export function TeamDetailSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header Banner */}
      <div className="h-24 animate-pulse bg-surface-hover" />

      <div className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 -mt-10 animate-pulse rounded-xl bg-surface-hover border-4 border-surface" />
            <div className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-surface-hover" />
              <div className="h-6 w-36 animate-pulse rounded bg-surface-hover" />
              <div className="h-4 w-56 animate-pulse rounded bg-surface-hover" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-6">
          <div className="h-4 w-24 animate-pulse rounded bg-surface-hover" />
          <div className="h-4 w-20 animate-pulse rounded bg-surface-hover" />
        </div>
      </div>

      <main className="p-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Members column */}
          <div className="lg:col-span-1">
            <div className="h-5 w-24 animate-pulse rounded bg-surface-hover mb-4" />
            <div className="rounded-lg border border-border bg-surface overflow-hidden divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-surface-hover" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-28 animate-pulse rounded bg-surface-hover" />
                    <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Boards column */}
          <div className="lg:col-span-2">
            <div className="h-5 w-20 animate-pulse rounded bg-surface-hover mb-4" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-surface p-4 space-y-3"
                >
                  <div className="h-5 w-32 animate-pulse rounded bg-surface-hover" />
                  <div className="h-4 w-24 animate-pulse rounded bg-surface-hover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
