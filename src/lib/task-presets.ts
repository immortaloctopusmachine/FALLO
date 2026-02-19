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
  const upper = title.toUpperCase();
  for (const [suffix, label] of SUFFIX_LABELS) {
    if (upper.endsWith(` - ${suffix}`)) {
      return label;
    }
  }
  return null;
}

export interface ChainLink {
  id: string;
  title: string;
  typeLabel: string; // "Concept", "Static Art", "Concept - FX/Animation", "FX/Animation", or truncated title
  isComplete: boolean;
  isCurrent: boolean;
  listName?: string;
  checklistProgress?: { done: number; total: number };
}

/** Check if a task is complete based on its checklists */
function isTaskComplete(card: Card): boolean {
  if (card.type !== 'TASK') return false;
  const task = card as TaskCard;
  const items = task.checklists?.flatMap(cl => cl.items) || [];
  return items.length > 0 && items.every(item => item.isComplete);
}

/** Get checklist progress for a card */
function getChecklistProgress(card: Card): { done: number; total: number } | undefined {
  if (card.type !== 'TASK') return undefined;
  const task = card as TaskCard;
  const items = task.checklists?.flatMap(cl => cl.items) || [];
  if (items.length === 0) return undefined;
  return { done: items.filter(i => i.isComplete).length, total: items.length };
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

  for (const card of allCards) {
    if (card.type !== 'TASK') continue;
    cardById.set(card.id, card);
    const taskData = (card as TaskCard).taskData;
    if (taskData?.dependsOnTaskId) {
      const existing = cardByDependsOn.get(taskData.dependsOnTaskId) || [];
      existing.push(card);
      cardByDependsOn.set(taskData.dependsOnTaskId, existing);
    }
  }

  const currentCard = cardById.get(taskId);
  if (!currentCard) return null;

  const currentTaskData = (currentCard as TaskCard).taskData;

  // Check if this card is part of any chain
  const hasPredecessor = !!currentTaskData?.dependsOnTaskId;
  const hasSuccessor = (cardByDependsOn.get(taskId) || []).length > 0;
  if (!hasPredecessor && !hasSuccessor) return null;

  // Walk backward to find chain start
  let chainStart = currentCard;
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

    chain.push({
      id: current.id,
      title: current.title,
      typeLabel: typeLabel || current.title.slice(0, 20),
      isComplete: isTaskComplete(current),
      isCurrent: current.id === taskId,
      listName: listInfo?.name,
      checklistProgress: getChecklistProgress(current),
    });

    // Find next in chain (task whose dependsOnTaskId === current.id)
    const successors: Card[] = cardByDependsOn.get(current.id) || [];
    current = successors[0]; // Take first successor (linear chain)
  }

  return chain.length > 1 ? chain : null;
}
