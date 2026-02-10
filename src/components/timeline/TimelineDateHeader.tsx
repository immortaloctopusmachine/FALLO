'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface TimelineDateHeaderProps {
  startDate: Date;
  endDate: Date;
  columnWidth: number;
  sticky?: boolean;
}

interface DateColumn {
  date: Date;
  label: string;
  isToday: boolean;
  isPast: boolean;
  isCurrentWorkWeek: boolean;
  isMonthStart: boolean;
  isWeekStart: boolean;
  monthKey: string;
  monthIndex: number;
}

export function TimelineDateHeader({
  startDate,
  endDate,
  columnWidth,
  sticky = true,
}: TimelineDateHeaderProps) {
  const columns = useMemo(() => {
    const cols: DateColumn[] = [];
    const current = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    const todayDay = weekStart.getDay();
    const mondayDiff = weekStart.getDate() - todayDay + (todayDay === 0 ? -6 : 1);
    weekStart.setDate(mondayDiff);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 4);

    const monthOrder = new Map<string, number>();
    let monthCounter = 0;

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Skip weekends
      if (!isWeekend) {
        const isToday = current.toDateString() === today.toDateString();
        const isPast = current < today;
        const isCurrentWorkWeek = current >= weekStart && current <= weekEnd;
        const isMonthStart = current.getDate() === 1;
        const isWeekStart = dayOfWeek === 1; // Monday
        const monthKey = `${current.getFullYear()}-${current.getMonth()}`;
        if (!monthOrder.has(monthKey)) {
          monthOrder.set(monthKey, monthCounter++);
        }
        const monthIndex = monthOrder.get(monthKey) || 0;

        cols.push({
          date: new Date(current),
          label: current.getDate().toString(),
          isToday,
          isPast,
          isCurrentWorkWeek,
          isMonthStart,
          isWeekStart,
          monthKey,
          monthIndex,
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return cols;
  }, [startDate, endDate]);

  // Group columns by month for month labels
  const monthGroups = useMemo(() => {
    const groups: { month: string; startIndex: number; count: number }[] = [];
    let currentMonth = '';
    let currentIndex = 0;

    columns.forEach((col, index) => {
      const month = col.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (month !== currentMonth) {
        if (currentMonth) {
          groups[groups.length - 1].count = index - currentIndex;
        }
        groups.push({ month, startIndex: index, count: 0 });
        currentMonth = month;
        currentIndex = index;
      }
    });

    if (groups.length > 0) {
      groups[groups.length - 1].count = columns.length - groups[groups.length - 1].startIndex;
    }

    return groups;
  }, [columns]);

  // Group columns by week for week labels
  const weekGroups = useMemo(() => {
    const groups: { week: string; startIndex: number; count: number }[] = [];
    let currentWeek = '';
    let currentIndex = 0;

    columns.forEach((col, index) => {
      const week = `W${getWeekNumber(col.date)}`;
      if (week !== currentWeek) {
        if (currentWeek) {
          groups[groups.length - 1].count = index - currentIndex;
        }
        groups.push({ week, startIndex: index, count: 0 });
        currentWeek = week;
        currentIndex = index;
      }
    });

    if (groups.length > 0) {
      groups[groups.length - 1].count = columns.length - groups[groups.length - 1].startIndex;
    }

    return groups;
  }, [columns]);

  return (
    <div className={cn(sticky ? 'sticky top-0 z-20' : '', 'bg-surface border-b border-border')}>
      {/* Month Row */}
      <div className="flex border-b border-border-subtle">
        {monthGroups.map((group, groupIndex) => (
          <div
            key={`${group.month}-${group.startIndex}`}
            className={cn(
              'flex-shrink-0 px-2 py-1 text-caption font-medium text-text-secondary border-r border-border-subtle',
              groupIndex % 2 === 0 ? 'bg-surface' : 'bg-surface-subtle/40'
            )}
            style={{ width: group.count * columnWidth }}
          >
            {group.month}
          </div>
        ))}
        {/* Fill remaining space */}
        <div className="flex-1 bg-surface min-w-0" />
      </div>

      {/* Week Row */}
      <div className="flex border-b border-border-subtle">
        {weekGroups.map((group, groupIndex) => (
          <div
            key={`${group.week}-${group.startIndex}`}
            className={cn(
              'flex-shrink-0 px-2 py-0.5 text-tiny text-text-tertiary border-r border-border-subtle',
              groupIndex % 2 === 0 ? 'bg-surface/60' : 'bg-surface-subtle/50'
            )}
            style={{ width: group.count * columnWidth }}
          >
            {group.week}
          </div>
        ))}
        {/* Fill remaining space */}
        <div className="flex-1 bg-surface min-w-0" />
      </div>

      {/* Day Row */}
      <div className="flex">
        {columns.map((col, index) => (
          <div
            key={index}
            className={cn(
              'flex-shrink-0 px-1 py-1 text-center text-tiny border-r border-border-subtle',
              col.monthIndex % 2 === 0 ? 'bg-surface' : 'bg-surface-subtle/30',
              col.isPast && 'text-text-tertiary line-through',
              col.isToday && 'bg-amber-200/50 text-amber-900 font-semibold no-underline',
              col.isCurrentWorkWeek && !col.isToday && !col.isPast && 'bg-emerald-200/35 text-emerald-900',
              col.isWeekStart && !col.isMonthStart && 'border-l-2 border-l-border',
              col.isMonthStart && 'border-l-4 border-l-card-epic/50'
            )}
            style={{ width: columnWidth }}
          >
            {col.label}
          </div>
        ))}
        {/* Fill remaining space */}
        <div className="flex-1 bg-surface border-r border-border-subtle min-w-0" />
      </div>
    </div>
  );
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
