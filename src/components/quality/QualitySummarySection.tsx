'use client';

import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QualitySummarySectionProps {
  expanded: boolean;
  onToggle: () => void;
  isLoading: boolean;
  hasData: boolean;
  children: ReactNode;
  loadingMessage?: string;
  unavailableMessage?: string;
}

export function QualitySummarySection({
  expanded,
  onToggle,
  isLoading,
  hasData,
  children,
  loadingMessage = 'Loading quality summary...',
  unavailableMessage = 'Quality summary unavailable.',
}: QualitySummarySectionProps) {
  return (
    <div
      className={cn(
        'border-b border-border bg-surface transition-all duration-300 overflow-hidden',
        expanded ? 'max-h-[1200px]' : 'max-h-10'
      )}
    >
      <div className="px-6 py-2">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-caption font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Gauge className="h-4 w-4" />
          Quality Summary
        </button>
      </div>

      {expanded && (
        <div className="px-6 pb-5">
          <div className="max-w-6xl rounded-lg border border-border bg-surface p-4 space-y-4">
            {isLoading ? (
              <div className="text-body text-text-tertiary">{loadingMessage}</div>
            ) : hasData ? (
              children
            ) : (
              <div className="text-body text-text-tertiary">{unavailableMessage}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
