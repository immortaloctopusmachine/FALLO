/**
 * Centralized constants for the application.
 *
 * This module provides a single source of truth for:
 * - Phase definitions and mappings
 * - Block type to phase mapping
 * - Search terms for phase matching
 */

import type { ListPhase } from '@/types';

/**
 * All valid list phases.
 */
export const VALID_PHASES: readonly ListPhase[] = [
  'BACKLOG',
  'SPINE_PROTOTYPE',
  'CONCEPT',
  'PRODUCTION',
  'TWEAK',
  'DONE',
] as const;

/**
 * Mapping from block type names (case-insensitive) to list phases.
 * Used when creating blocks or lists from block types.
 *
 * Note: QA and MARKETING map to TWEAK phase as they're considered part of the finalization stage.
 */
export const BLOCK_TYPE_TO_PHASE: Record<string, ListPhase> = {
  // Direct mappings
  'BACKLOG': 'BACKLOG',
  'SPINE_PROTOTYPE': 'SPINE_PROTOTYPE',
  'SPINE PROTOTYPE': 'SPINE_PROTOTYPE',
  'SPINE': 'SPINE_PROTOTYPE',
  'PROTOTYPE': 'SPINE_PROTOTYPE',
  'CONCEPT': 'CONCEPT',
  'PRODUCTION': 'PRODUCTION',
  'TWEAK': 'TWEAK',
  'DONE': 'DONE',
  // Alternative mappings
  'QA': 'TWEAK',
  'MARKETING': 'TWEAK',
};

/**
 * Search terms for matching list names to phases.
 * Used in timeline sync and phase detection.
 */
export const PHASE_SEARCH_TERMS: Record<ListPhase, readonly string[]> = {
  BACKLOG: ['backlog'],
  SPINE_PROTOTYPE: ['spine', 'prototype'],
  CONCEPT: ['concept'],
  PRODUCTION: ['production'],
  TWEAK: ['tweak', 'qa', 'marketing'],
  DONE: ['done', 'complete', 'finished'],
};

/**
 * Get the phase for a block type name.
 *
 * @param blockTypeName - The block type name (case-insensitive)
 * @returns The corresponding phase, or null if not found
 */
export function getPhaseFromBlockType(blockTypeName: string): ListPhase | null {
  const normalized = blockTypeName.toUpperCase().trim();
  return BLOCK_TYPE_TO_PHASE[normalized] ?? null;
}

/**
 * Detect the phase from a list name by searching for phase keywords.
 *
 * @param listName - The list name to analyze
 * @returns The detected phase, or null if no match
 */
export function detectPhaseFromName(listName: string): ListPhase | null {
  const normalized = listName.toLowerCase();

  for (const [phase, terms] of Object.entries(PHASE_SEARCH_TERMS)) {
    for (const term of terms) {
      if (normalized.includes(term)) {
        return phase as ListPhase;
      }
    }
  }

  return null;
}

/**
 * Check if a string represents a valid phase.
 *
 * @param value - The value to check
 * @returns true if the value is a valid ListPhase
 */
export function isValidPhase(value: string): value is ListPhase {
  return VALID_PHASES.includes(value as ListPhase);
}

/**
 * Phase colors matching the design system.
 * Synced with PHASE_COLORS in list-templates.ts and block type colors in seed.ts.
 */
export const PHASE_COLORS: Record<ListPhase, string> = {
  BACKLOG: '#6B7280',        // Gray
  SPINE_PROTOTYPE: '#EC4899', // Pink
  CONCEPT: '#A855F7',        // Purple
  PRODUCTION: '#22C55E',     // Green
  TWEAK: '#F97316',          // Orange
  DONE: '#10B981',           // Emerald
};
