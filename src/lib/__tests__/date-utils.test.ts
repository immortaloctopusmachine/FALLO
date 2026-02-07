import { describe, it, expect } from 'vitest';
import {
  getMonday,
  snapToMonday,
  getFriday,
  getBlockEndDate,
  addBusinessDays,
  getBusinessDaysBetween,
  moveBlockDates,
  moveBlockByWeeks,
  formatDateRange,
  formatMonthYear,
} from '../date-utils';

describe('date-utils', () => {
  describe('getMonday', () => {
    it('returns same date when input is Monday', () => {
      // Jan 6, 2025 is a Monday
      const monday = new Date(2025, 0, 6);
      const result = getMonday(monday);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(6);
    });

    it('returns Monday for a mid-week date', () => {
      // Jan 8, 2025 is a Wednesday
      const wednesday = new Date(2025, 0, 8);
      const result = getMonday(wednesday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(6); // Previous Monday
    });

    it('returns Monday for a Friday', () => {
      // Jan 10, 2025 is a Friday
      const friday = new Date(2025, 0, 10);
      const result = getMonday(friday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(6);
    });

    it('returns previous Monday for a Saturday', () => {
      // Jan 11, 2025 is a Saturday
      const saturday = new Date(2025, 0, 11);
      const result = getMonday(saturday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(6);
    });

    it('returns previous Monday for a Sunday', () => {
      // Jan 12, 2025 is a Sunday
      const sunday = new Date(2025, 0, 12);
      const result = getMonday(sunday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(6); // Goes back 6 days
    });

    it('handles year boundary correctly', () => {
      // Jan 1, 2025 is a Wednesday
      const jan1 = new Date(2025, 0, 1);
      const result = getMonday(jan1);
      expect(result.getDay()).toBe(1);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(11); // December
      expect(result.getDate()).toBe(30);
    });

    it('does not mutate the original date', () => {
      const original = new Date(2025, 0, 8);
      const originalTime = original.getTime();
      getMonday(original);
      expect(original.getTime()).toBe(originalTime);
    });
  });

  describe('snapToMonday', () => {
    it('returns same date when input is Monday', () => {
      const monday = new Date(2025, 0, 6);
      const result = snapToMonday(monday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(6);
    });

    it('returns previous Monday for mid-week days', () => {
      // Wednesday Jan 8, 2025
      const wednesday = new Date(2025, 0, 8);
      const result = snapToMonday(wednesday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(6);
    });

    it('returns NEXT Monday for Saturday (different from getMonday)', () => {
      // Saturday Jan 11, 2025 -> next Monday Jan 13
      const saturday = new Date(2025, 0, 11);
      const result = snapToMonday(saturday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(13);
    });

    it('returns NEXT Monday for Sunday (different from getMonday)', () => {
      // Sunday Jan 12, 2025 -> next Monday Jan 13
      const sunday = new Date(2025, 0, 12);
      const result = snapToMonday(sunday);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(13);
    });
  });

  describe('getFriday', () => {
    it('returns Friday when given Monday', () => {
      // Monday Jan 6, 2025
      const monday = new Date(2025, 0, 6);
      const result = getFriday(monday);
      expect(result.getDay()).toBe(5); // Friday
      expect(result.getDate()).toBe(10);
    });

    it('always adds 4 days', () => {
      const monday = new Date(2025, 0, 13);
      const result = getFriday(monday);
      expect(result.getDate()).toBe(17);
    });
  });

  describe('getBlockEndDate', () => {
    it('is an alias for getFriday', () => {
      const monday = new Date(2025, 0, 6);
      expect(getBlockEndDate(monday).getTime()).toBe(getFriday(monday).getTime());
    });
  });

  describe('addBusinessDays', () => {
    it('adds days without crossing weekend', () => {
      // Monday Jan 6, 2025 + 3 days = Thursday Jan 9
      const monday = new Date(2025, 0, 6);
      const result = addBusinessDays(monday, 3);
      expect(result.getDay()).toBe(4); // Thursday
      expect(result.getDate()).toBe(9);
    });

    it('skips weekend when adding days', () => {
      // Friday Jan 10, 2025 + 1 day = Monday Jan 13
      const friday = new Date(2025, 0, 10);
      const result = addBusinessDays(friday, 1);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(13);
    });

    it('skips multiple weekends', () => {
      // Monday Jan 6, 2025 + 10 days = Monday Jan 20
      const monday = new Date(2025, 0, 6);
      const result = addBusinessDays(monday, 10);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(20);
    });

    it('subtracts business days', () => {
      // Friday Jan 10, 2025 - 4 days = Monday Jan 6
      const friday = new Date(2025, 0, 10);
      const result = addBusinessDays(friday, -4);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(6);
    });

    it('skips weekend when subtracting', () => {
      // Monday Jan 13, 2025 - 1 day = Friday Jan 10
      const monday = new Date(2025, 0, 13);
      const result = addBusinessDays(monday, -1);
      expect(result.getDay()).toBe(5); // Friday
      expect(result.getDate()).toBe(10);
    });

    it('returns same date for 0 days', () => {
      const date = new Date(2025, 0, 8);
      const result = addBusinessDays(date, 0);
      expect(result.getTime()).toBe(date.getTime());
    });

    it('handles starting on Saturday', () => {
      // Saturday Jan 11, 2025 + 1 day = Monday Jan 13
      const saturday = new Date(2025, 0, 11);
      const result = addBusinessDays(saturday, 1);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(13);
    });

    it('handles starting on Sunday', () => {
      // Sunday Jan 12, 2025 + 1 day = Monday Jan 13
      const sunday = new Date(2025, 0, 12);
      const result = addBusinessDays(sunday, 1);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(13);
    });
  });

  describe('getBusinessDaysBetween', () => {
    it('counts business days in a single week', () => {
      // Mon Jan 6 to Fri Jan 10 = 5 days
      const monday = new Date(2025, 0, 6);
      const friday = new Date(2025, 0, 10);
      expect(getBusinessDaysBetween(monday, friday)).toBe(5);
    });

    it('returns 1 for same day', () => {
      const date = new Date(2025, 0, 6);
      expect(getBusinessDaysBetween(date, date)).toBe(1);
    });

    it('excludes weekends', () => {
      // Mon Jan 6 to Mon Jan 13 (includes weekend)
      const monday1 = new Date(2025, 0, 6);
      const monday2 = new Date(2025, 0, 13);
      expect(getBusinessDaysBetween(monday1, monday2)).toBe(6); // 5 + 1
    });

    it('counts two full weeks correctly', () => {
      // Mon Jan 6 to Fri Jan 17 = 10 business days
      const start = new Date(2025, 0, 6);
      const end = new Date(2025, 0, 17);
      expect(getBusinessDaysBetween(start, end)).toBe(10);
    });

    it('returns 0 for weekend-only range', () => {
      // Sat Jan 11 to Sun Jan 12
      const saturday = new Date(2025, 0, 11);
      const sunday = new Date(2025, 0, 12);
      expect(getBusinessDaysBetween(saturday, sunday)).toBe(0);
    });
  });

  describe('moveBlockDates', () => {
    it('moves forward by 1 week', () => {
      // Mon Jan 6, 2025 -> Mon Jan 13, 2025
      const start = new Date(2025, 0, 6);
      const { newStartDate, newEndDate } = moveBlockDates(start, 1);

      expect(newStartDate.getDay()).toBe(1); // Monday
      expect(newStartDate.getDate()).toBe(13);
      expect(newEndDate.getDay()).toBe(5); // Friday
      expect(newEndDate.getDate()).toBe(17);
    });

    it('moves backward by 1 week', () => {
      // Mon Jan 13, 2025 -> Mon Jan 6, 2025
      const start = new Date(2025, 0, 13);
      const { newStartDate, newEndDate } = moveBlockDates(start, -1);

      expect(newStartDate.getDate()).toBe(6);
      expect(newEndDate.getDate()).toBe(10);
    });

    it('handles mid-week start date', () => {
      // Wed Jan 8, 2025 (in week of Mon Jan 6) -> Mon Jan 13, 2025
      const wednesday = new Date(2025, 0, 8);
      const { newStartDate } = moveBlockDates(wednesday, 1);

      expect(newStartDate.getDay()).toBe(1);
      expect(newStartDate.getDate()).toBe(13);
    });

    it('returns Mon-Fri 5-day block', () => {
      const start = new Date(2025, 0, 6);
      const { newStartDate, newEndDate } = moveBlockDates(start, 2);

      const days = (newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(days).toBe(4); // Mon to Fri = 4 days difference
    });
  });

  describe('moveBlockByWeeks', () => {
    it('moves and snaps to Monday', () => {
      const start = new Date(2025, 0, 6);
      const result = moveBlockByWeeks(start, 1);

      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(13);
    });

    it('handles moving to a weekend position', () => {
      // This would result in a Sunday, which should snap to next Monday
      const start = new Date(2025, 0, 5); // Sunday
      const result = moveBlockByWeeks(start, 1);

      // Should be a Monday
      expect(result.getDay()).toBe(1);
    });
  });

  describe('formatDateRange', () => {
    it('formats same-month range', () => {
      const start = new Date(2026, 0, 6); // Jan 6, 2026
      const end = new Date(2026, 0, 10); // Jan 10, 2026
      expect(formatDateRange(start, end)).toBe('Jan 6 - Jan 10');
    });

    it('formats cross-month range', () => {
      const start = new Date(2026, 0, 27);
      const end = new Date(2026, 1, 3);
      expect(formatDateRange(start, end)).toBe('Jan 27 - Feb 3');
    });

    it('includes year for different year', () => {
      const start = new Date(2025, 0, 6);
      const end = new Date(2025, 0, 10);
      expect(formatDateRange(start, end)).toBe('Jan 6 - Jan 10, 2025');
    });

    it('includes year when explicitly requested', () => {
      const start = new Date(2026, 0, 6);
      const end = new Date(2026, 0, 10);
      expect(formatDateRange(start, end, { includeYear: true })).toBe('Jan 6 - Jan 10, 2026');
    });

    it('handles string dates', () => {
      expect(formatDateRange('2026-01-06', '2026-01-10')).toBe('Jan 6 - Jan 10');
    });
  });

  describe('formatMonthYear', () => {
    it('formats month and year', () => {
      const date = new Date(2026, 0, 15);
      expect(formatMonthYear(date)).toBe('January 2026');
    });

    it('handles different months', () => {
      const date = new Date(2026, 11, 1); // December
      expect(formatMonthYear(date)).toBe('December 2026');
    });
  });
});
