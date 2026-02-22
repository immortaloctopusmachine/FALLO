import type { Card, TaskCard } from '@/types';

// Preset definitions for linked task creation from User Stories
export const LINKED_TASK_PRESETS = [
  { key: 'concept', suffix: 'CONCEPT', color: '#8b5cf6', defaultStoryPoints: 3, defaultTag: 'Concept' },
  { key: 'static_art', suffix: 'STATIC ART', color: '#22c55e', defaultStoryPoints: 5, defaultTag: 'Final' },
  { key: 'concept_fx', suffix: 'CONCEPT : FX/ANIMATION', color: '#8b5cf6', defaultStoryPoints: 3, defaultTag: 'Concept' },
  { key: 'fx_animation', suffix: 'FX/ANIMATION', color: '#ec4899', defaultStoryPoints: 5, defaultTag: 'Final' },
] as const;

export type LinkedTaskPresetKey = (typeof LINKED_TASK_PRESETS)[number]['key'];

// Known suffixes → display labels for extracting type label from card title
// Order matters: longer suffixes first so "CONCEPT : FX/ANIMATION" matches before "FX/ANIMATION"
const SUFFIX_LABELS: [suffix: string, label: string][] = [
  ['CONCEPT : FX/ANIMATION', 'Concept - FX/Animation'],
  ['STATIC ART', 'Static Art'],
  ['FX/ANIMATION', 'FX/Animation'],
  ['CONCEPT', 'Concept'],
];

/** Extract the type label from a task title (e.g. "Walk cycle - CONCEPT" → "Concept") */
export function extractTaskTypeLabel(title: string): string | null {
  // Strip version suffix for matching (e.g. " : v2", " : v3")
  const versionMatch = title.match(/\s*:\s*(v\d+)$/i);
  const stripped = versionMatch ? title.replace(/\s*:\s*v\d+$/i, '') : title;
  const upper = stripped.toUpperCase();
  for (const [suffix, label] of SUFFIX_LABELS) {
    if (upper.endsWith(` - ${suffix}`)) {
      // Re-append version suffix to the label if present
      return versionMatch ? `${label} : ${versionMatch[1]}` : label;
    }
  }
  return null;
}

/**
 * Generate a versioned copy title.
 * "M2 - CONCEPT" → "M2 - CONCEPT : v2"
 * "M2 - CONCEPT : v2" → "M2 - CONCEPT : v3"
 */
export function generateVersionedTitle(title: string): string {
  const match = title.match(/^(.+?)\s*:\s*v(\d+)$/);
  if (match) {
    const baseName = match[1];
    const currentVersion = parseInt(match[2], 10);
    return `${baseName} : v${currentVersion + 1}`;
  }
  return `${title} : v2`;
}

export interface ChainLink {
  id: string;
  title: string;
  typeLabel: string; // "Concept", "Static Art", "Concept - FX/Animation", "FX/Animation", or truncated title
  isComplete: boolean;
  isCurrent: boolean;
  listName?: string;
  versions?: ChainLink[]; // Version copies of this chain node
}

/** Check if a task is complete based on its list phase */
function isTaskComplete(card: Card): boolean {
  if (card.type !== 'TASK') return false;
  const task = card as TaskCard;
  return task.list?.phase === 'DONE';
}

/**
 * Build the full dependency chain for a given task.
 * Walks backward (via dependsOnTaskId) and forward (tasks that depend on this one)
 * to construct the ordered chain.
 */
export function buildDependencyChain(
  taskId: string,
  allCards: Card[]
): ChainLink[] | null {
  // Build lookup maps
  const cardById = new Map<string, Card>();
  const cardByDependsOn = new Map<string, Card[]>(); // dependsOnTaskId → cards that depend on it
  const versionsByOriginal = new Map<string, Card[]>(); // versionOfCardId → version cards

  for (const card of allCards) {
    if (card.type !== 'TASK') continue;
    cardById.set(card.id, card);
    const taskData = (card as TaskCard).taskData;
    if (taskData?.dependsOnTaskId) {
      const existing = cardByDependsOn.get(taskData.dependsOnTaskId) || [];
      existing.push(card);
      cardByDependsOn.set(taskData.dependsOnTaskId, existing);
    }
    if (taskData?.versionOfCardId) {
      const existing = versionsByOriginal.get(taskData.versionOfCardId) || [];
      existing.push(card);
      versionsByOriginal.set(taskData.versionOfCardId, existing);
    }
  }

  // If the current card is a version, resolve to the original for chain building
  let resolvedTaskId = taskId;
  const currentCard = cardById.get(taskId);
  if (!currentCard) return null;
  const currentTaskData = (currentCard as TaskCard).taskData;
  if (currentTaskData?.versionOfCardId) {
    const original = cardById.get(currentTaskData.versionOfCardId);
    if (original) {
      resolvedTaskId = original.id;
    }
  }

  const resolvedCard = cardById.get(resolvedTaskId)!;
  const resolvedTaskData = (resolvedCard as TaskCard).taskData;

  // Check if this card is part of any chain
  const hasPredecessor = !!resolvedTaskData?.dependsOnTaskId;
  const hasSuccessor = (cardByDependsOn.get(resolvedTaskId) || []).length > 0;
  const hasVersions = (versionsByOriginal.get(resolvedTaskId) || []).length > 0;
  // Also check if the original task we resolved to is part of a chain
  if (!hasPredecessor && !hasSuccessor && !hasVersions) return null;

  // Walk backward to find chain start
  let chainStart = resolvedCard;
  const visited = new Set<string>();
  while (true) {
    visited.add(chainStart.id);
    const td = (chainStart as TaskCard).taskData;
    if (!td?.dependsOnTaskId) break;
    const prev = cardById.get(td.dependsOnTaskId);
    if (!prev || visited.has(prev.id)) break;
    chainStart = prev;
  }

  // Walk forward from chain start to build ordered chain
  const chain: ChainLink[] = [];
  let current: Card | undefined = chainStart;
  const chainVisited = new Set<string>();

  while (current && !chainVisited.has(current.id)) {
    chainVisited.add(current.id);
    const typeLabel = extractTaskTypeLabel(current.title);
    const listInfo = (current as TaskCard).list;

    // Build version sub-links for this chain node
    const versionCards = versionsByOriginal.get(current.id) || [];
    const versions: ChainLink[] = versionCards.map((vc) => ({
      id: vc.id,
      title: vc.title,
      typeLabel: extractTaskTypeLabel(vc.title) || vc.title.slice(0, 20),
      isComplete: isTaskComplete(vc),
      isCurrent: vc.id === taskId,
      listName: (vc as TaskCard).list?.name,
    }));

    chain.push({
      id: current.id,
      title: current.title,
      typeLabel: typeLabel || current.title.slice(0, 20),
      isComplete: isTaskComplete(current),
      isCurrent: current.id === taskId,
      listName: listInfo?.name,
      ...(versions.length > 0 ? { versions } : {}),
    });

    // Find next in chain (task whose dependsOnTaskId === current.id)
    const successors: Card[] = cardByDependsOn.get(current.id) || [];
    current = successors[0]; // Take first successor (linear chain)
  }

  // For version cards viewing a chain with only 1 node + versions, still show
  if (chain.length === 1 && chain[0].versions && chain[0].versions.length > 0) {
    return chain;
  }

  return chain.length > 1 ? chain : null;
}
