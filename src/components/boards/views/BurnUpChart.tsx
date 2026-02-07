'use client';

import { useMemo, useCallback } from 'react';
import type { WeeklyProgress } from '@/types';

interface BurnUpChartProps {
  data: WeeklyProgress[];
  height?: number;
  showSprintLines?: boolean;
  sprintWeeks?: number;
}

export function BurnUpChart({
  data,
  height = 200,
  showSprintLines = true,
  sprintWeeks = 2,
}: BurnUpChartProps) {
  // Sort data by date
  const sortedData = useMemo(() => {
    return [...data].sort(
      (a, b) => new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime()
    );
  }, [data]);

  // Calculate chart dimensions
  const chartPadding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = 240;
  const chartHeight = height - chartPadding.top - chartPadding.bottom;

  // Get max values for scaling
  const maxPoints = useMemo(() => {
    if (sortedData.length === 0) return 100;
    return Math.max(...sortedData.map(d => d.totalStoryPoints), 1);
  }, [sortedData]);

  // Scale functions
  const xScale = useCallback((index: number) => {
    if (sortedData.length <= 1) return chartPadding.left;
    return chartPadding.left + (index / (sortedData.length - 1)) * (chartWidth - chartPadding.left - chartPadding.right);
  }, [chartPadding.left, chartPadding.right, chartWidth, sortedData.length]);

  const yScale = useCallback((value: number) => {
    return chartHeight + chartPadding.top - (value / maxPoints) * chartHeight;
  }, [chartHeight, chartPadding.top, maxPoints]);

  // Generate path for completed points (burn-up line)
  const completedPath = useMemo(() => {
    if (sortedData.length === 0) return '';

    const points = sortedData.map((d, i) => `${xScale(i)},${yScale(d.completedPoints)}`);
    return `M ${points.join(' L ')}`;
  }, [sortedData, xScale, yScale]);

  // Generate path for total points (scope line)
  const totalPath = useMemo(() => {
    if (sortedData.length === 0) return '';

    const points = sortedData.map((d, i) => `${xScale(i)},${yScale(d.totalStoryPoints)}`);
    return `M ${points.join(' L ')}`;
  }, [sortedData, xScale, yScale]);

  // Generate area fill for completed
  const completedArea = useMemo(() => {
    if (sortedData.length === 0) return '';

    const points = sortedData.map((d, i) => `${xScale(i)},${yScale(d.completedPoints)}`);
    const baseline = `${xScale(sortedData.length - 1)},${yScale(0)} ${xScale(0)},${yScale(0)}`;
    return `M ${points.join(' L ')} L ${baseline} Z`;
  }, [sortedData, xScale, yScale]);

  // Calculate sprint boundaries
  const sprintBoundaries = useMemo(() => {
    if (!showSprintLines || sortedData.length === 0) return [];

    const boundaries: number[] = [];
    for (let i = sprintWeeks; i < sortedData.length; i += sprintWeeks) {
      boundaries.push(i);
    }
    return boundaries;
  }, [sortedData.length, showSprintLines, sprintWeeks]);

  // Format date for labels
  const formatWeekLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (sortedData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-text-tertiary text-caption"
        style={{ height }}
      >
        No progress data yet
      </div>
    );
  }

  return (
    <svg width={chartWidth} height={height} className="overflow-visible">
      {/* Grid lines */}
      <g className="text-border-subtle">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <line
            key={tick}
            x1={chartPadding.left}
            x2={chartWidth - chartPadding.right}
            y1={yScale(tick * maxPoints)}
            y2={yScale(tick * maxPoints)}
            stroke="currentColor"
            strokeDasharray="2,2"
            opacity={0.5}
          />
        ))}
      </g>

      {/* Sprint boundaries */}
      {sprintBoundaries.map((index) => (
        <line
          key={`sprint-${index}`}
          x1={xScale(index)}
          x2={xScale(index)}
          y1={chartPadding.top}
          y2={chartHeight + chartPadding.top}
          stroke="currentColor"
          strokeDasharray="4,4"
          className="text-border"
          opacity={0.7}
        />
      ))}

      {/* Completed area fill */}
      <path
        d={completedArea}
        fill="url(#completedGradient)"
        opacity={0.3}
      />

      {/* Total points line (scope) */}
      <path
        d={totalPath}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray="4,4"
        className="text-text-tertiary"
      />

      {/* Completed points line (burn-up) */}
      <path
        d={completedPath}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        className="text-success"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {sortedData.map((d, i) => (
        <g key={d.id}>
          <circle
            cx={xScale(i)}
            cy={yScale(d.completedPoints)}
            r={4}
            fill="currentColor"
            className="text-success"
          />
          <circle
            cx={xScale(i)}
            cy={yScale(d.totalStoryPoints)}
            r={3}
            fill="currentColor"
            className="text-text-tertiary"
          />
        </g>
      ))}

      {/* Y-axis labels */}
      <text
        x={chartPadding.left - 8}
        y={yScale(maxPoints)}
        textAnchor="end"
        className="fill-text-tertiary text-tiny"
        dominantBaseline="middle"
      >
        {maxPoints}
      </text>
      <text
        x={chartPadding.left - 8}
        y={yScale(0)}
        textAnchor="end"
        className="fill-text-tertiary text-tiny"
        dominantBaseline="middle"
      >
        0
      </text>

      {/* X-axis labels (first and last) */}
      {sortedData.length > 0 && (
        <>
          <text
            x={xScale(0)}
            y={height - 8}
            textAnchor="start"
            className="fill-text-tertiary text-tiny"
          >
            {formatWeekLabel(sortedData[0].weekStartDate)}
          </text>
          {sortedData.length > 1 && (
            <text
              x={xScale(sortedData.length - 1)}
              y={height - 8}
              textAnchor="end"
              className="fill-text-tertiary text-tiny"
            >
              {formatWeekLabel(sortedData[sortedData.length - 1].weekStartDate)}
            </text>
          )}
        </>
      )}

      {/* Legend */}
      <g transform={`translate(${chartPadding.left}, ${height - 4})`}>
        <line x1={0} x2={16} y1={0} y2={0} stroke="currentColor" strokeWidth={2} className="text-success" />
        <text x={20} y={0} className="fill-text-tertiary text-tiny" dominantBaseline="middle">Done</text>
        <line x1={60} x2={76} y1={0} y2={0} stroke="currentColor" strokeWidth={2} strokeDasharray="4,4" className="text-text-tertiary" />
        <text x={80} y={0} className="fill-text-tertiary text-tiny" dominantBaseline="middle">Scope</text>
      </g>

      {/* Gradient definition */}
      <defs>
        <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
        </linearGradient>
      </defs>
    </svg>
  );
}
