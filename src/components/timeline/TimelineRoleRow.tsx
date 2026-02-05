'use client';

import { useMemo } from 'react';
import { getMonday } from '@/lib/date-utils';
import type { UserWeeklyAvailability, TimelineMember } from '@/types';

interface CompanyRole {
  id: string;
  name: string;
  color: string | null;
  position: number;
}

interface TimelineRoleRowProps {
  role: CompanyRole;
  members: TimelineMember[];
  availability: UserWeeklyAvailability[];
  boardId: string;
  startDate: Date;
  endDate: Date;
  columnWidth: number;
  rowHeight: number;
  onWeekClick?: (weekStart: Date, roleId: string, roleMembers: TimelineMember[]) => void;
  isAdmin?: boolean;
}

// Constants
const DAYS_PER_WEEK = 5;

export function TimelineRoleRow({
  role,
  members,
  availability,
  boardId: _boardId,
  startDate,
  endDate,
  columnWidth,
  rowHeight,
  onWeekClick,
  isAdmin = false,
}: TimelineRoleRowProps) {
  // Calculate weeks to display
  const weeks = useMemo(() => {
    const result: Date[] = [];
    const current = new Date(startDate);

    // Make sure we start from Monday
    const monday = getMonday(current);

    while (monday <= endDate) {
      result.push(new Date(monday));
      monday.setDate(monday.getDate() + 7);
    }

    return result;
  }, [startDate, endDate]);

  // Get members that have this role
  const roleMembers = useMemo(() => {
    return members.filter(member =>
      member.userCompanyRoles.some(ucr => ucr.companyRole.id === role.id)
    );
  }, [members, role.id]);

  // Group availability by week for easy lookup
  const availabilityByWeek = useMemo(() => {
    const map = new Map<string, UserWeeklyAvailability[]>();

    availability.forEach(a => {
      // Check if this user has the role
      const member = roleMembers.find(m => m.id === a.userId);
      if (!member) return;

      const weekKey = getMonday(new Date(a.weekStart)).toISOString().split('T')[0];
      const existing = map.get(weekKey) || [];
      existing.push(a);
      map.set(weekKey, existing);
    });

    return map;
  }, [availability, roleMembers]);

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
    // Count business days from startDate to weekStart
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

  // Format availability display text for a week
  const formatAvailabilityText = (weekAvailability: UserWeeklyAvailability[] | undefined) => {
    if (!weekAvailability || weekAvailability.length === 0) {
      return null;
    }

    // Sort by dedication (highest first) then by name
    const sorted = [...weekAvailability].sort((a, b) => {
      if (b.dedication !== a.dedication) return b.dedication - a.dedication;
      const nameA = a.user.name || a.user.email;
      const nameB = b.user.name || b.user.email;
      return nameA.localeCompare(nameB);
    });

    // Take first 2 users max for display
    const displayUsers = sorted.slice(0, 2);
    const remaining = sorted.length - 2;

    const userTexts = displayUsers.map(a => {
      const name = a.user.name?.split(' ')[0] || a.user.email.split('@')[0];
      return `${name} ${a.dedication}%`;
    });

    let text = userTexts.join(', ');
    if (remaining > 0) {
      text += ` +${remaining}`;
    }

    return text;
  };

  // If no members have this role, don't render the row
  if (roleMembers.length === 0) {
    return null;
  }

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
        const weekAvailability = availabilityByWeek.get(weekKey);
        const { left, width } = getWeekPosition(weekStart);
        const displayText = formatAvailabilityText(weekAvailability);
        const hasAvailability = weekAvailability && weekAvailability.length > 0;

        return (
          <button
            key={weekKey}
            type="button"
            className={`absolute top-1 bottom-1 rounded-sm transition-colors text-left overflow-hidden ${
              hasAvailability
                ? 'bg-surface-active hover:bg-surface-hover'
                : isAdmin
                  ? 'hover:bg-surface-subtle cursor-pointer'
                  : ''
            }`}
            style={{
              left: left + 2,
              width: width - 4,
              backgroundColor: hasAvailability && role.color
                ? `${role.color}20`
                : undefined,
            }}
            onClick={() => isAdmin && onWeekClick?.(weekStart, role.id, roleMembers)}
            disabled={!isAdmin}
          >
            {displayText && (
              <div
                className="px-1.5 py-0.5 text-caption truncate"
                style={{ color: role.color || 'var(--text-secondary)' }}
              >
                {displayText}
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
