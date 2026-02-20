export function HomeSkeleton() {
  return (
    <div className="flex-1 p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="h-10 w-72 animate-pulse rounded-md bg-surface-hover" />
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
