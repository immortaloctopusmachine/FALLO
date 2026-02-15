import type { Prisma } from '@prisma/client';

const PROJECT_ARCHIVED_AT_KEY = 'projectArchivedAt';
const BOARD_ARCHIVED_ONLY_AT_KEY = 'boardArchivedOnlyAt';

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

export function parseProjectArchivedAt(settings: unknown): Date | null {
  const settingsObject = asObject(settings);
  const rawValue = settingsObject[PROJECT_ARCHIVED_AT_KEY];
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return null;
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function parseBoardArchivedOnlyAt(settings: unknown): Date | null {
  const settingsObject = asObject(settings);
  const rawValue = settingsObject[BOARD_ARCHIVED_ONLY_AT_KEY];
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return null;
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function setProjectArchivedAt(
  settings: unknown,
  archivedAt: Date = new Date()
): Prisma.InputJsonValue {
  const nextSettings = asObject(settings);
  nextSettings[PROJECT_ARCHIVED_AT_KEY] = archivedAt.toISOString();
  delete nextSettings[BOARD_ARCHIVED_ONLY_AT_KEY];
  return nextSettings as Prisma.InputJsonValue;
}

export function setBoardArchivedOnlyAt(
  settings: unknown,
  archivedAt: Date = new Date()
): Prisma.InputJsonValue {
  const nextSettings = asObject(settings);
  nextSettings[BOARD_ARCHIVED_ONLY_AT_KEY] = archivedAt.toISOString();
  delete nextSettings[PROJECT_ARCHIVED_AT_KEY];
  return nextSettings as Prisma.InputJsonValue;
}

export function clearBoardArchivedOnlyAt(settings: unknown): Prisma.InputJsonValue {
  const nextSettings = asObject(settings);
  delete nextSettings[BOARD_ARCHIVED_ONLY_AT_KEY];
  return nextSettings as Prisma.InputJsonValue;
}

export function clearProjectArchivedAt(settings: unknown): Prisma.InputJsonValue {
  const nextSettings = asObject(settings);
  delete nextSettings[PROJECT_ARCHIVED_AT_KEY];
  delete nextSettings[BOARD_ARCHIVED_ONLY_AT_KEY];
  return nextSettings as Prisma.InputJsonValue;
}
