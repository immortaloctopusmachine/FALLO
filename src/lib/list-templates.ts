import type { ListPhase, BoardTemplateType, ListViewType } from '@/types';

// List template definition
export interface ListTemplateItem {
  name: string;
  viewType: ListViewType;
  phase?: ListPhase;
  color: string;
  durationWeeks: number;
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
export const PHASE_COLORS = {
  BACKLOG: '#6B7280',      // Gray
  SPINE_PROTOTYPE: '#EC4899', // Pink
  CONCEPT: '#A855F7',      // Purple
  PRODUCTION: '#22C55E',   // Green
  TWEAK: '#EAB308',        // Yellow
  DONE: '#10B981',         // Emerald
} as const;

// Standard Slot template (full production cycle)
export const STANDARD_SLOT_TEMPLATE: ListTemplate = {
  id: 'STANDARD_SLOT',
  name: 'Standard Slot',
  description: 'Full production cycle with 8 production phases (2 weeks each)',
  taskLists: [
    { name: 'Backlog', viewType: 'TASKS', phase: 'BACKLOG', color: PHASE_COLORS.BACKLOG, durationWeeks: 0, position: 0 },
    { name: 'To Do', viewType: 'TASKS', color: '#3B82F6', durationWeeks: 0, position: 1 },
    { name: 'In Progress', viewType: 'TASKS', color: '#F59E0B', durationWeeks: 0, position: 2 },
    { name: 'Review', viewType: 'TASKS', color: '#8B5CF6', durationWeeks: 0, position: 3 },
    { name: 'Done', viewType: 'TASKS', phase: 'DONE', color: PHASE_COLORS.DONE, durationWeeks: 0, position: 4 },
  ],
  planningLists: [
    { name: 'Spine/Prototype', viewType: 'PLANNING', phase: 'SPINE_PROTOTYPE', color: PHASE_COLORS.SPINE_PROTOTYPE, durationWeeks: 2, position: 0 },
    { name: 'Concept', viewType: 'PLANNING', phase: 'CONCEPT', color: PHASE_COLORS.CONCEPT, durationWeeks: 2, position: 1 },
    { name: 'Production 1-2', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 2, position: 2 },
    { name: 'Production 3-4', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 2, position: 3 },
    { name: 'Production 5-6', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 2, position: 4 },
    { name: 'Production 7-8', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 2, position: 5 },
    { name: 'Tweak', viewType: 'PLANNING', phase: 'TWEAK', color: PHASE_COLORS.TWEAK, durationWeeks: 2, position: 6 },
  ],
};

// Branded Game template (shorter cycle)
export const BRANDED_GAME_TEMPLATE: ListTemplate = {
  id: 'BRANDED_GAME',
  name: 'Branded Game',
  description: 'Shorter production cycle with 4 production phases',
  taskLists: [
    { name: 'Backlog', viewType: 'TASKS', phase: 'BACKLOG', color: PHASE_COLORS.BACKLOG, durationWeeks: 0, position: 0 },
    { name: 'To Do', viewType: 'TASKS', color: '#3B82F6', durationWeeks: 0, position: 1 },
    { name: 'In Progress', viewType: 'TASKS', color: '#F59E0B', durationWeeks: 0, position: 2 },
    { name: 'Review', viewType: 'TASKS', color: '#8B5CF6', durationWeeks: 0, position: 3 },
    { name: 'Done', viewType: 'TASKS', phase: 'DONE', color: PHASE_COLORS.DONE, durationWeeks: 0, position: 4 },
  ],
  planningLists: [
    { name: 'Concept', viewType: 'PLANNING', phase: 'CONCEPT', color: PHASE_COLORS.CONCEPT, durationWeeks: 1, position: 0 },
    { name: 'Production 1-2', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 2, position: 1 },
    { name: 'Production 3-4', viewType: 'PLANNING', phase: 'PRODUCTION', color: PHASE_COLORS.PRODUCTION, durationWeeks: 2, position: 2 },
    { name: 'Tweak', viewType: 'PLANNING', phase: 'TWEAK', color: PHASE_COLORS.TWEAK, durationWeeks: 1, position: 3 },
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

// Calculate list dates based on project start date
export function calculateListDates(
  template: ListTemplate,
  projectStartDate: Date
): { listName: string; startDate: Date; endDate: Date }[] {
  const dates: { listName: string; startDate: Date; endDate: Date }[] = [];
  const currentDate = new Date(projectStartDate);

  for (const list of template.planningLists) {
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + list.durationWeeks * 7 - 1);

    dates.push({
      listName: list.name,
      startDate,
      endDate,
    });

    // Move to next phase
    currentDate.setDate(currentDate.getDate() + list.durationWeeks * 7);
  }

  return dates;
}

// Format date range for display
export function formatDateRange(startDate: Date | string, endDate: Date | string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  const startStr = start.toLocaleDateString('en-US', formatOptions);
  const endStr = end.toLocaleDateString('en-US', formatOptions);

  // Include year if different from current year
  const currentYear = new Date().getFullYear();
  if (start.getFullYear() !== currentYear || end.getFullYear() !== currentYear) {
    return `${startStr} - ${endStr}, ${end.getFullYear()}`;
  }

  return `${startStr} - ${endStr}`;
}

// Get the "Done" list ID from task lists
export function getDoneListId(lists: { id: string; phase?: string | null; viewType: string }[]): string | undefined {
  return lists.find(l => l.viewType === 'TASKS' && l.phase === 'DONE')?.id;
}

// Calculate total project duration in weeks
export function getTotalDurationWeeks(template: ListTemplate): number {
  return template.planningLists.reduce((sum, list) => sum + list.durationWeeks, 0);
}
