'use client';

import { useMemo } from 'react';
import type { WeeklyProgress } from '@/types';

interface BurnupSparklineProps {
  data: WeeklyProgress[];
  width?: number;
  height?: number;
}

export function BurnupSparkline({
  data,
  width = 200,
  height = 40,
}: BurnupSparklineProps) {
  const sorted = useMemo(
    () =>
      [...data].sort(
        (a, b) =>
          new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime(),
      ),
    [data],
  );

  const maxPoints = useMemo(() => {
    if (sorted.length === 0) return 1;
    return Math.max(...sorted.map((d) => d.totalStoryPoints), 1);
  }, [sorted]);

  const pad = { top: 2, right: 2, bottom: 2, left: 2 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const x = (i: number) => {
    if (sorted.length <= 1) return pad.left + innerW / 2;
    return pad.left + (i / (sorted.length - 1)) * innerW;
  };
  const y = (v: number) => pad.top + innerH - (v / maxPoints) * innerH;

  const scopePath = useMemo(() => {
    if (sorted.length === 0) return '';
    return 'M ' + sorted.map((d, i) => `${x(i)},${y(d.totalStoryPoints)}`).join(' L ');
  }, [sorted, maxPoints]); // eslint-disable-line react-hooks/exhaustive-deps

  const donePath = useMemo(() => {
    if (sorted.length === 0) return '';
    return 'M ' + sorted.map((d, i) => `${x(i)},${y(d.completedPoints)}`).join(' L ');
  }, [sorted, maxPoints]); // eslint-disable-line react-hooks/exhaustive-deps

  const doneArea = useMemo(() => {
    if (sorted.length === 0) return '';
    const pts = sorted.map((d, i) => `${x(i)},${y(d.completedPoints)}`);
    return `M ${pts.join(' L ')} L ${x(sorted.length - 1)},${y(0)} L ${x(0)},${y(0)} Z`;
  }, [sorted, maxPoints]); // eslint-disable-line react-hooks/exhaustive-deps

  if (sorted.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-text-tertiary"
        style={{ width, height }}
      >
        <span className="text-[9px]">No data</span>
      </div>
    );
  }

  return (
    <svg width={width} height={height} className="block">
      {/* Completed area fill */}
      <path d={doneArea} fill="#10B981" opacity={0.15} />
      {/* Scope line (dashed gray) */}
      <path
        d={scopePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeDasharray="3,2"
        className="text-text-tertiary"
      />
      {/* Done line (solid green) */}
      <path
        d={donePath}
        fill="none"
        stroke="#10B981"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
