export function UsersSkeleton() {
  return (
    <main className="p-6 flex-1">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-5 w-28 animate-pulse rounded bg-surface-hover" />
          <div className="h-4 w-56 animate-pulse rounded bg-surface-hover mt-1" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded bg-surface-hover" />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-hover">
            <tr>
              {['User', 'Permission', 'Teams', 'Roles', 'Skills', 'Activity'].map((h) => (
                <th key={h} className="text-left text-caption font-medium text-text-secondary px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="bg-surface">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 animate-pulse rounded-full bg-surface-hover" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-28 animate-pulse rounded bg-surface-hover" />
                      <div className="h-3 w-36 animate-pulse rounded bg-surface-hover" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-16 animate-pulse rounded bg-surface-hover" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-5 w-20 animate-pulse rounded bg-surface-hover" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-5 w-16 animate-pulse rounded bg-surface-hover" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <div className="h-5 w-5 animate-pulse rounded-full bg-surface-hover" />
                    <div className="h-5 w-5 animate-pulse rounded-full bg-surface-hover" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-24 animate-pulse rounded bg-surface-hover" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
