export function UserDetailSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Profile Header */}
      <div className="border-b border-border bg-surface px-6 py-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 animate-pulse rounded-full bg-surface-hover" />
            <div className="space-y-2">
              <div className="h-6 w-40 animate-pulse rounded bg-surface-hover" />
              <div className="h-4 w-48 animate-pulse rounded bg-surface-hover" />
              <div className="flex gap-3">
                <div className="h-5 w-16 animate-pulse rounded bg-surface-hover" />
                <div className="h-5 w-28 animate-pulse rounded bg-surface-hover" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded bg-surface-hover" />
            <div className="h-9 w-24 animate-pulse rounded bg-surface-hover" />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 w-24 animate-pulse rounded bg-surface-hover" />
          ))}
        </div>
      </div>

      <main className="p-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <div>
              <div className="h-5 w-20 animate-pulse rounded bg-surface-hover mb-4" />
              <div className="rounded-lg border border-border bg-surface overflow-hidden divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-surface-hover" />
                    <div className="h-4 w-24 animate-pulse rounded bg-surface-hover" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="h-5 w-28 animate-pulse rounded bg-surface-hover mb-4" />
              <div className="rounded-lg border border-border bg-surface overflow-hidden divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3">
                    <div className="h-4 w-32 animate-pulse rounded bg-surface-hover" />
                    <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="h-5 w-20 animate-pulse rounded bg-surface-hover mb-4" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
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
        </div>
      </main>
    </div>
  );
}
