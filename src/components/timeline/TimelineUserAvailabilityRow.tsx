'use client';

import { useMemo } from 'react';
import { getMonday } from '@/lib/date-utils';
import type { UserWeeklyAvailability, TimelineMember } from '@/types';

interface TimelineUserAvailabilityRowProps {
  member: TimelineMember;
  availability: UserWeeklyAvailability[];
  boardId: string;
  startDate: Date;
  endDate: Date;
  columnWidth: number;
  rowHeight: number;
  onWeekClick?: (weekStart: Date, member: TimelineMember) => void;
  isAdmin?: boolean;
}

// Constants
const DAYS_PER_WEEK = 5;

export function TimelineUserAvailabilityRow({
  member,
  availability,
  boardId: _boardId,
  startDate,
  endDate,
  columnWidth,
  rowHeight,
  onWeekClick,
  isAdmin = false,
}: TimelineUserAvailabilityRowProps) {
  // Primary role color for cell backgrounds
  const primaryRoleColor = member.userCompanyRoles[0]?.companyRole.color || null;

  // Calculate weeks to display
  const weeks = useMemo(() => {
    const result: Date[] = [];
    const monday = getMonday(new Date(startDate));

    while (monday <= endDate) {
      result.push(new Date(monday));
      monday.setDate(monday.getDate() + 7);
    }

    return result;
  }, [startDate, endDate]);

  // Map availability by week for this user
  const availabilityByWeek = useMemo(() => {
    const map = new Map<string, number>();

    availability.forEach(a => {
      if (a.userId !== member.id) return;
      const weekKey = getMonday(new Date(a.weekStart)).toISOString().split('T')[0];
      map.set(weekKey, a.dedication);
    });

    return map;
  }, [availability, member.id]);

  // Generate CSS background for grid lines
  const gridBackground = useMemo(() => {
    const weekWidth = columnWidth * DAYS_PER_WEEK;
    return {
      backgroundImage: `
        repeating-linear-gradient(
          to right,
          transparent,
          transparent ${columnWidth - 1}px,
          var(--border-subtle) ${columnWidth - 1}px,
          var(--border-subtle) ${columnWidth}px
        ),
        repeating-linear-gradient(
          to right,
          transparent,
          transparent ${weekWidth - 2}px,
          var(--border) ${weekWidth - 2}px,
          var(--border) ${weekWidth}px
        )
      `,
      backgroundSize: `${columnWidth}px 100%, ${weekWidth}px 100%`,
    };
  }, [columnWidth]);

  // Calculate the position and width for a week cell
  const getWeekPosition = (weekStart: Date) => {
    let daysFromStart = 0;
    const current = new Date(startDate);

    while (current < weekStart) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysFromStart++;
      }
      current.setDate(current.getDate() + 1);
    }

    return {
      left: daysFromStart * columnWidth,
      width: DAYS_PER_WEEK * columnWidth,
    };
  };

  return (
    <div
      className="relative border-b border-border-subtle w-full"
      style={{
        height: rowHeight,
        ...gridBackground,
      }}
    >
      {/* Week cells */}
      {weeks.map((weekStart) => {
        const weekKey = weekStart.toISOString().split('T')[0];
        const dedication = availabilityByWeek.get(weekKey);
        const { left, width } = getWeekPosition(weekStart);
        const hasDedication = dedication !== undefined && dedication > 0;

        return (
          <button
            key={weekKey}
            type="button"
            className={`absolute top-1 bottom-1 rounded-sm transition-colors text-center overflow-hidden ${
              hasDedication
                ? 'hover:opacity-80'
                : isAdmin
                  ? 'hover:bg-surface-subtle cursor-pointer'
                  : ''
            }`}
            style={{
              left: left + 2,
              width: width - 4,
              backgroundColor: hasDedication && primaryRoleColor
                ? `${primaryRoleColor}25`
                : hasDedication
                  ? 'var(--surface-active)'
                  : undefined,
            }}
            onClick={() => isAdmin && onWeekClick?.(weekStart, member)}
            disabled={!isAdmin}
          >
            {hasDedication && (
              <div
                className="px-1 py-0.5 text-caption font-medium truncate"
                style={{ color: primaryRoleColor || 'var(--text-secondary)' }}
              >
                {dedication}%
              </div>
            )}
          </button>
        );
      })}

      {/* Today indicator */}
      <TodayIndicator startDate={startDate} columnWidth={columnWidth} />
    </div>
  );
}

function TodayIndicator({
  startDate,
  columnWidth,
}: {
  startDate: Date;
  columnWidth: number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let daysFromStart = 0;
  const current = new Date(startDate);
  while (current < today) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysFromStart++;
    }
    current.setDate(current.getDate() + 1);
  }

  if (current.toDateString() !== today.toDateString()) {
    return null;
  }

  const left = daysFromStart * columnWidth + columnWidth / 2;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-error z-10 pointer-events-none"
      style={{ left }}
    />
  );
}
