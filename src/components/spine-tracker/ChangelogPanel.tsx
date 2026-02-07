'use client';

import type { ChangelogResult } from '@/types/spine-tracker';

interface ChangelogPanelProps {
  changelog: ChangelogResult;
  hasBaseline: boolean;
  onSkeletonClick?: (name: string) => void;
}

export function ChangelogPanel({ changelog, hasBaseline, onSkeletonClick }: ChangelogPanelProps) {
  if (!hasBaseline) {
    return (
      <div className="p-3">
        <h3 className="text-caption font-semibold text-text-primary mb-2">Latest Changes</h3>
        <p className="text-xs text-text-tertiary">Set baseline to track changes</p>
      </div>
    );
  }

  if (!changelog.hasChanges) {
    return (
      <div className="p-3">
        <h3 className="text-caption font-semibold text-text-primary mb-2">Latest Changes</h3>
        <p className="text-xs text-text-tertiary">No changes since baseline</p>
      </div>
    );
  }

  const recentChanges = changelog.changes.slice(0, 8);

  return (
    <div className="p-3">
      <h3 className="text-caption font-semibold text-text-primary mb-2">
        Latest Changes ({changelog.changes.length})
      </h3>
      <div className="space-y-1">
        {recentChanges.map((change, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs">
            <span className="shrink-0 mt-0.5">
              {change.type === 'added' && <span className="text-emerald-400">+</span>}
              {change.type === 'removed' && <span className="text-red-400">-</span>}
              {change.type === 'modified' && <span className="text-blue-400">~</span>}
            </span>
            <div className="min-w-0">
              <button
                className="font-mono text-text-primary hover:text-blue-400 transition-colors truncate block"
                onClick={() => onSkeletonClick?.(change.skeleton)}
              >
                {change.skeleton}
              </button>
              <p className="text-text-tertiary truncate">{change.detail}</p>
            </div>
          </div>
        ))}
        {changelog.changes.length > 8 && (
          <p className="text-xs text-text-tertiary">
            +{changelog.changes.length - 8} more changes
          </p>
        )}
      </div>
    </div>
  );
}
