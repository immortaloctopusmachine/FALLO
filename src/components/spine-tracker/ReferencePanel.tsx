'use client';

import { useMemo } from 'react';
import type { Skeleton, ChangelogResult } from '@/types/spine-tracker';
import { Z_ORDER_RANGES } from './constants';
import { ChangelogPanel } from './ChangelogPanel';

interface ReferencePanelProps {
  skeletons: Skeleton[];
  changelog: ChangelogResult;
  hasBaseline: boolean;
  onSkeletonClick: (name: string) => void;
}

export function ReferencePanel({ skeletons, changelog, hasBaseline, onSkeletonClick }: ReferencePanelProps) {
  // Build hierarchy tree
  const hierarchy = useMemo(() => {
    const roots: { skeleton: Skeleton; children: Skeleton[] }[] = [];
    const childMap = new Map<string, Skeleton[]>();

    // Index children by parent name
    skeletons.forEach((s) => {
      if (s.placement.parent) {
        const children = childMap.get(s.placement.parent) || [];
        children.push(s);
        childMap.set(s.placement.parent, children);
      }
    });

    // Find root skeletons (no parent or parent doesn't exist)
    skeletons.forEach((s) => {
      if (!s.placement.parent) {
        roots.push({
          skeleton: s,
          children: (childMap.get(s.name) || []).sort((a, b) => a.zOrder - b.zOrder),
        });
      }
    });

    return roots.sort((a, b) => a.skeleton.zOrder - b.skeleton.zOrder);
  }, [skeletons]);

  return (
    <div className="flex flex-col h-full border-l border-border bg-surface overflow-y-auto">
      {/* Changelog */}
      <div className="border-b border-border">
        <ChangelogPanel
          changelog={changelog}
          hasBaseline={hasBaseline}
          onSkeletonClick={onSkeletonClick}
        />
      </div>

      {/* Hierarchy */}
      <div className="border-b border-border p-3">
        <h3 className="text-caption font-semibold text-text-primary mb-2">Hierarchy</h3>
        <div className="space-y-0.5 font-mono text-xs">
          {hierarchy.map(({ skeleton, children }) => (
            <div key={skeleton.id}>
              <button
                className="text-text-primary hover:text-blue-400 transition-colors"
                onClick={() => onSkeletonClick(skeleton.name)}
              >
                {skeleton.name}
                <span className="text-text-tertiary ml-1">(z:{skeleton.zOrder})</span>
              </button>
              {children.map((child, i) => (
                <div key={child.id} className="ml-3 flex items-center">
                  <span className="text-text-tertiary mr-1">
                    {i === children.length - 1 ? '└' : '├'}
                  </span>
                  <button
                    className="text-text-secondary hover:text-blue-400 transition-colors"
                    onClick={() => onSkeletonClick(child.name)}
                  >
                    {child.name}
                    <span className="text-text-tertiary ml-1">(z:{child.zOrder})</span>
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Z-Order Reference */}
      <div className="p-3">
        <h3 className="text-caption font-semibold text-text-primary mb-2">Z-Order Reference</h3>
        <div className="space-y-0.5">
          {Z_ORDER_RANGES.map((r) => (
            <div key={r.range} className="flex items-center text-xs">
              <span className="text-text-primary font-mono w-14 shrink-0">{r.range}</span>
              <span className="text-text-secondary flex-1">{r.layer}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
