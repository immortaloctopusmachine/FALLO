export function OrganizationSkeleton() {
  return (
    <main className="p-6 flex-1">
      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-md bg-surface-hover" />
                <div className="space-y-1.5">
                  <div className="h-7 w-8 animate-pulse rounded bg-surface-hover" />
                  <div className="h-3 w-14 animate-pulse rounded bg-surface-hover" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="h-5 w-32 animate-pulse rounded bg-surface-hover mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-surface overflow-hidden"
              >
                <div className="flex items-center gap-3 p-4">
                  <div className="h-10 w-10 animate-pulse rounded-md bg-surface-hover" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-28 animate-pulse rounded bg-surface-hover" />
                    <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="h-5 w-28 animate-pulse rounded bg-surface-hover mb-4" />
          <div className="rounded-lg border border-border bg-surface overflow-hidden divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="h-9 w-9 animate-pulse rounded-full bg-surface-hover" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-28 animate-pulse rounded bg-surface-hover" />
                  <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
