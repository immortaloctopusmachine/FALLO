export function HomeSkeleton() {
  return (
    <div className="flex-1 p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex items-start gap-5 rounded-lg border border-border bg-surface p-5">
          <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-surface-hover" />
          <div className="space-y-3">
            <div className="h-7 w-56 animate-pulse rounded-md bg-surface-hover" />
            <div className="h-4 w-80 animate-pulse rounded-md bg-surface-hover" />
            <div className="flex gap-2 pt-1">
              <div className="h-9 w-28 animate-pulse rounded-md bg-surface-hover" />
              <div className="h-9 w-28 animate-pulse rounded-md bg-surface-hover" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-24 animate-pulse rounded-lg border border-border bg-surface-hover" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="h-[420px] animate-pulse rounded-lg border border-border bg-surface-hover" />
          <div className="h-[420px] animate-pulse rounded-lg border border-border bg-surface-hover" />
        </div>
      </div>
    </div>
  );
}
