'use client';

import { useMemo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TimelineAssignment } from '@/types';

interface TimelineUserRowProps {
  assignments: TimelineAssignment[];
  startDate: Date;
  endDate: Date;
  columnWidth: number;
  rowHeight: number;
  totalColumns: number;
  minWidth?: string;
}

interface DedicationCell {
  date: Date;
  dedication: number;
}

export function TimelineUserRow({
  assignments,
  startDate,
  endDate,
  columnWidth,
  rowHeight,
  totalColumns,
  minWidth,
}: TimelineUserRowProps) {
  // Calculate dedication per day
  const dedicationByDay = useMemo(() => {
    const cells: DedicationCell[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Find all assignments for this day
        let totalDedication = 0;

        assignments.forEach((assignment) => {
          const assignStart = new Date(assignment.startDate);
          const assignEnd = new Date(assignment.endDate);
          assignStart.setHours(0, 0, 0, 0);
          assignEnd.setHours(23, 59, 59, 999);

          if (current >= assignStart && current <= assignEnd) {
            totalDedication += assignment.dedication;
          }
        });

        cells.push({
          date: new Date(current),
          dedication: Math.min(totalDedication, 100),
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return cells;
  }, [assignments, startDate, endDate]);

  // Calculate which columns are week/month starts for visual separators
  const columnInfo = useMemo(() => {
    const info: { isWeekStart: boolean; isMonthStart: boolean }[] = [];
    const current = new Date(startDate);
    let columnIndex = 0;

    while (columnIndex < totalColumns) {
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (!isWeekend) {
        const isWeekStart = dayOfWeek === 1; // Monday
        const isMonthStart = current.getDate() === 1;
        info.push({ isWeekStart, isMonthStart });
        columnIndex++;
      }

      current.setDate(current.getDate() + 1);
    }

    return info;
  }, [startDate, totalColumns]);

  return (
    <div className="relative border-b border-border-subtle bg-surface-subtle" style={{ height: rowHeight, minWidth: minWidth || '100%' }}>
      {/* Grid lines with week/month separators */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: totalColumns }).map((_, i) => {
          const { isWeekStart, isMonthStart } = columnInfo[i] || {};
          return (
            <div
              key={i}
              className={cn(
                'flex-shrink-0 border-r border-border-subtle/50',
                // Week start: medium border
                isWeekStart && !isMonthStart && 'border-l-2 border-l-border',
                // Month start: strong border with distinct color
                isMonthStart && 'border-l-4 border-l-card-epic/50'
              )}
              style={{ width: columnWidth }}
            />
          );
        })}
        {/* Fill remaining space */}
        <div className="flex-1 bg-surface-subtle" />
      </div>

      {/* Dedication cells */}
      <div className="absolute inset-0 flex">
        {dedicationByDay.map((cell, index) => (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: columnWidth }}
                >
                  {cell.dedication > 0 && (
                    <div
                      className={cn(
                        'text-tiny font-medium rounded px-1',
                        cell.dedication >= 100 && 'bg-success/20 text-success',
                        cell.dedication >= 75 && cell.dedication < 100 && 'bg-info/20 text-info',
                        cell.dedication >= 50 && cell.dedication < 75 && 'bg-warning/20 text-warning',
                        cell.dedication > 0 && cell.dedication < 50 && 'bg-surface-active text-text-secondary'
                      )}
                    >
                      {cell.dedication}%
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {cell.dedication > 0 && (
                <TooltipContent>
                  <div className="text-caption">
                    <div className="font-medium">
                      {cell.date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="text-text-secondary">
                      {cell.dedication}% dedicated
                    </div>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}
