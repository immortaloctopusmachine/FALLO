export function TeamsSkeleton() {
  return (
    <main className="p-6 flex-1">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-5 w-32 animate-pulse rounded bg-surface-hover" />
          <div className="h-4 w-56 animate-pulse rounded bg-surface-hover mt-1" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded bg-surface-hover" />
      </div>
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, groupIdx) => (
          <div key={groupIdx}>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-surface-hover" />
              <div className="h-4 w-24 animate-pulse rounded bg-surface-hover" />
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
          </div>
        ))}
      </div>
    </main>
  );
}
