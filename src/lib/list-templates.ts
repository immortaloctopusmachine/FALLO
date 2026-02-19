import type { ListPhase, BoardTemplateType, ListViewType } from '@/types';
import { addBusinessDays, snapToMonday } from '@/lib/date-utils';

// List template definition
export interface ListTemplateItem {
  name: string;
  viewType: ListViewType;
  phase?: ListPhase;
  color: string;
  durationWeeks: number;
  durationDays?: number; // Alternative: duration in business days (for 5-day blocks)
  position: number;
}

export interface ListTemplate {
  id: BoardTemplateType;
  name: string;
  description: string;
  taskLists: ListTemplateItem[];
  planningLists: ListTemplateItem[];
}

// Blank template (simple starter board)
export const BLANK_TEMPLATE: ListTemplate = {
  id: 'BLANK',
  name: 'Blank Board',
  description: 'Start fresh with basic To Do, In Progress, and Done lists',
  taskLists: [
    { name: 'To Do', viewType: 'TASKS', color: '#3B82F6', durationWeeks: 0, position: 0 },
    { name: 'In Progress', viewType: 'TASKS', color: '#F59E0B', durationWeeks: 0, position: 1 },
    { name: 'Done', viewType: 'TASKS', phase: 'DONE', color: '#10B981', durationWeeks: 0, position: 2 },
  ],
  planningLists: [],
};

// Color palette for list phases
// Synced with block type colors in prisma/seed.ts
export const PHASE_COLORS = {
  BACKLOG: '#6B7280',        // Gray
  SPINE_PROTOTYPE: '#EC4899', // Pink
  CONCEPT: '#A855F7',        // Purple
  PRODUCTION: '#22C55E',     // Green
  TWEAK: '#F97316',          // Orange
  QA: '#3B82F6',             // Blue
  MARKETING: '#1E3A8A',      // Dark Blue
  DONE: '#10B981',           // Emerald
} as const;

// Standard Slot template (full production cycle with 5-day blocks)
export const STANDARD_SLOT_TEMPLATE: ListTemplate = {
  id: 'STANDARD_SLOT',
  name: 'Standard Slot',
  description: 'Full production cycle with 5-day blocks starting on Mondays',
  taskLists: [
    { name: 'Backlog', viewType: 'TASKS', phase: 'BACKLOG', color: PHASE_COLORS.BACKLOG, durationWeeks: 0, position: 0 },
    { name: 'To Do FX/Animation', viewType: 'TASKS', color: '#800020', durationWeeks: 0, position: 1 },
    { name: 'To Do', viewType: 'TASKS', color: '#3B82F6', durationWeeks: 0, position: 2 },
    { name: 'In Progress', viewType: 'TASKS', color: '#F59E0B', durationWeeks: 0, position: 3 },
    { name: 'Review', viewType: 'TASKS', color: '#8B5CF6', durationWeeks: 0, position: 4 },
    { name: 'Done', viewType: 'TASKS', phase: 'DONE', color: PHASE_COLORS.DONE, durationWeeks: 0, position: 5 },
  ],
  planningLists: [
    { name: 'Spine/Prototype 1', viewType: 'PLANNING', phase: 'SPINE_PROTOTYPE', color: PHASE_COLORS.SPINE_PROTOTYPE, durationWeeks: 0, durationDays: 5, position: 0 },
    { name: 'Spine/Prototype 2', viewType: 'PLANNING', phase: 'SPINE_PROTOTYPE', color: PHASE_COLORS.SPINE_PROTOTYPE, durationWeeks: 0, durationDays: 5, position: 1 },
    { name: 'Concept 1', viewType: 'PLANNING', phase: 'CONCEPT', color: PHASE_COLORS.CONCEPT, durationWeeks: 0, durationDays: 5, position: 2 },
    { name: 'Concept 2', viewType: 'PLANNING', phase: 'CONCEPT', color: PHASE_COLORS.CONCEPT, durationWeeks: 0, durationDays: 5, position: 3 },
    { name: 'Production 1', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 0, durationDays: 5, position: 4 },
    { name: 'Production 2', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 0, durationDays: 5, position: 5 },
    { name: 'Production 3', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 0, durationDays: 5, position: 6 },
    { name: 'Production 4', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 0, durationDays: 5, position: 7 },
    { name: 'Production 5', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 0, durationDays: 5, position: 8 },
    { name: 'Production 6', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 0, durationDays: 5, position: 9 },
    { name: 'Production 7', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 0, durationDays: 5, position: 10 },
    { name: 'Production 8', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 0, durationDays: 5, position: 11 },
    { name: 'Tweak 1', viewType: 'PLANNING', phase: 'TWEAK', color: PHASE_COLORS.TWEAK, durationWeeks: 0, durationDays: 5, position: 12 },
    { name: 'Tweak 2', viewType: 'PLANNING', phase: 'TWEAK', color: PHASE_COLORS.TWEAK, durationWeeks: 0, durationDays: 5, position: 13 },
  ],
};

// Branded Game template (shorter cycle with 5-day blocks)
export const BRANDED_GAME_TEMPLATE: ListTemplate = {
  id: 'BRANDED_GAME',
  name: 'Branded Game',
  description: 'Shorter production cycle with 5-day blocks',
  taskLists: [
    { name: 'Backlog', viewType: 'TASKS', phase: 'BACKLOG', color: PHASE_COLORS.BACKLOG, durationWeeks: 0, position: 0 },
    { name: 'To Do FX/Animation', viewType: 'TASKS', color: '#800020', durationWeeks: 0, position: 1 },
    { name: 'To Do', viewType: 'TASKS', color: '#3B82F6', durationWeeks: 0, position: 2 },
    { name: 'In Progress', viewType: 'TASKS', color: '#F59E0B', durationWeeks: 0, position: 3 },
    { name: 'Review', viewType: 'TASKS', color: '#8B5CF6', durationWeeks: 0, position: 4 },
    { name: 'Done', viewType: 'TASKS', phase: 'DONE', color: PHASE_COLORS.DONE, durationWeeks: 0, position: 5 },
  ],
  planningLists: [
    { name: 'Concept 1', viewType: 'PLANNING', phase: 'CONCEPT', color: PHASE_COLORS.CONCEPT, durationWeeks: 0, durationDays: 5, position: 0 },
    { name: 'Production 1', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 0, durationDays: 5, position: 1 },
    { name: 'Production 2', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 0, durationDays: 5, position: 2 },
    { name: 'Production 3', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 0, durationDays: 5, position: 3 },
    { name: 'Production 4', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 0, durationDays: 5, position: 4 },
    { name: 'Tweak 1', viewType: 'PLANNING', phase: 'TWEAK', color: PHASE_COLORS.TWEAK, durationWeeks: 0, durationDays: 5, position: 5 },
  ],
};

// All templates
export const BOARD_TEMPLATES: Record<BoardTemplateType, ListTemplate> = {
  BLANK: BLANK_TEMPLATE,
  STANDARD_SLOT: STANDARD_SLOT_TEMPLATE,
  BRANDED_GAME: BRANDED_GAME_TEMPLATE,
};

// For backwards compatibility
export const LIST_TEMPLATES = BOARD_TEMPLATES;

// Default project links
export const DEFAULT_PROJECT_LINKS = {
  gameOverviewPlanning: 'https://evrymatrix-my.sharepoint.com/:x:/g/personal/tianzhi_zhou_everymatrix_com/EXtwhYRGosJOltrfSjN9a_EBwqDn3Ih49H9IE-FOaujvOg?e=nIkCV8',
  animationDocument: 'https://docs.google.com/spreadsheets/d/1MqsEtiOHBmasUXqR-lnQveNKADRlr-yONQSRfUbSqG8/edit?pli=1&gid=969359797#gid=969359797',
  gameSheetInfo: 'https://docs.google.com/spreadsheets/d/1m-06xxkZtN4mPyW08--3AQ_c7N0AUa76pxDAmXsj9mo/edit?gid=1649564802#gid=1649564802',
  gameNameBrainstorming: 'https://docs.google.com/spreadsheets/d/1gsDa2F9ojf5jCtJMqPgF0xFhoVgxw5tsNpEMORCuEJg/edit#gid=235114580',
};

// Re-export date utilities for backwards compatibility
export { addBusinessDays, snapToMonday, getBlockEndDate, moveBlockByWeeks, formatDateRange } from '@/lib/date-utils';

// Calculate list dates based on project start date
// Project start date is snapped to Monday to ensure all blocks align to week boundaries
export function calculateListDates(
  template: ListTemplate,
  projectStartDate: Date
): { listName: string; startDate: Date; endDate: Date; durationDays?: number }[] {
  const dates: { listName: string; startDate: Date; endDate: Date; durationDays?: number }[] = [];
  // Snap project start to Monday for consistent week alignment
  let currentDate = snapToMonday(new Date(projectStartDate));

  for (const list of template.planningLists) {
    const startDate = new Date(currentDate);
    let endDate: Date;
    let durationDays: number | undefined;

    if (list.durationDays !== undefined) {
      // Use business days (for 5-day blocks)
      durationDays = list.durationDays;
      endDate = addBusinessDays(startDate, list.durationDays - 1);
      currentDate = addBusinessDays(endDate, 1);
    } else {
      // Use calendar weeks
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + list.durationWeeks * 7 - 1);
      currentDate = new Date(endDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    dates.push({
      listName: list.name,
      startDate,
      endDate,
      durationDays,
    });
  }

  return dates;
}

// Get the "Done" list ID from task lists
export function getDoneListId(lists: { id: string; phase?: string | null; viewType: string }[]): string | undefined {
  return lists.find(l => l.viewType === 'TASKS' && l.phase === 'DONE')?.id;
}

// Calculate total project duration in weeks
export function getTotalDurationWeeks(template: ListTemplate): number {
  return template.planningLists.reduce((sum, list) => sum + list.durationWeeks, 0);
}
