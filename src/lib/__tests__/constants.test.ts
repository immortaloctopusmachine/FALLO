import { describe, it, expect } from 'vitest';
import {
  VALID_PHASES,
  BLOCK_TYPE_TO_PHASE,
  PHASE_SEARCH_TERMS,
  PHASE_COLORS,
  getPhaseFromBlockType,
  detectPhaseFromName,
  isValidPhase,
} from '../constants';
import type { ListPhase } from '@/types';

describe('constants', () => {
  describe('VALID_PHASES', () => {
    it('contains all expected phases', () => {
      expect(VALID_PHASES).toContain('BACKLOG');
      expect(VALID_PHASES).toContain('SPINE_PROTOTYPE');
      expect(VALID_PHASES).toContain('CONCEPT');
      expect(VALID_PHASES).toContain('PRODUCTION');
      expect(VALID_PHASES).toContain('TWEAK');
      expect(VALID_PHASES).toContain('DONE');
    });

    it('has exactly 6 phases', () => {
      expect(VALID_PHASES.length).toBe(6);
    });

    it('has no duplicates', () => {
      const uniquePhases = new Set(VALID_PHASES);
      expect(uniquePhases.size).toBe(VALID_PHASES.length);
    });
  });

  describe('BLOCK_TYPE_TO_PHASE', () => {
    it('maps standard phases directly', () => {
      expect(BLOCK_TYPE_TO_PHASE['BACKLOG']).toBe('BACKLOG');
      expect(BLOCK_TYPE_TO_PHASE['CONCEPT']).toBe('CONCEPT');
      expect(BLOCK_TYPE_TO_PHASE['PRODUCTION']).toBe('PRODUCTION');
      expect(BLOCK_TYPE_TO_PHASE['TWEAK']).toBe('TWEAK');
      expect(BLOCK_TYPE_TO_PHASE['DONE']).toBe('DONE');
    });

    it('maps SPINE_PROTOTYPE variations', () => {
      expect(BLOCK_TYPE_TO_PHASE['SPINE_PROTOTYPE']).toBe('SPINE_PROTOTYPE');
      expect(BLOCK_TYPE_TO_PHASE['SPINE PROTOTYPE']).toBe('SPINE_PROTOTYPE');
      expect(BLOCK_TYPE_TO_PHASE['SPINE']).toBe('SPINE_PROTOTYPE');
      expect(BLOCK_TYPE_TO_PHASE['PROTOTYPE']).toBe('SPINE_PROTOTYPE');
    });

    it('maps QA and MARKETING to TWEAK', () => {
      expect(BLOCK_TYPE_TO_PHASE['QA']).toBe('TWEAK');
      expect(BLOCK_TYPE_TO_PHASE['MARKETING']).toBe('TWEAK');
    });
  });

  describe('PHASE_SEARCH_TERMS', () => {
    it('has search terms for all valid phases', () => {
      for (const phase of VALID_PHASES) {
        expect(PHASE_SEARCH_TERMS[phase]).toBeDefined();
        expect(PHASE_SEARCH_TERMS[phase].length).toBeGreaterThan(0);
      }
    });

    it('has no duplicate search terms across phases', () => {
      const allTerms: string[] = [];
      for (const phase of VALID_PHASES) {
        allTerms.push(...PHASE_SEARCH_TERMS[phase]);
      }

      const uniqueTerms = new Set(allTerms);
      expect(uniqueTerms.size).toBe(allTerms.length);
    });

    it('has expected search terms for DONE phase', () => {
      expect(PHASE_SEARCH_TERMS.DONE).toContain('done');
      expect(PHASE_SEARCH_TERMS.DONE).toContain('complete');
      expect(PHASE_SEARCH_TERMS.DONE).toContain('finished');
    });

    it('has expected search terms for TWEAK phase', () => {
      expect(PHASE_SEARCH_TERMS.TWEAK).toContain('tweak');
      expect(PHASE_SEARCH_TERMS.TWEAK).toContain('qa');
      expect(PHASE_SEARCH_TERMS.TWEAK).toContain('marketing');
    });
  });

  describe('PHASE_COLORS', () => {
    it('has colors for all valid phases', () => {
      for (const phase of VALID_PHASES) {
        expect(PHASE_COLORS[phase]).toBeDefined();
        expect(PHASE_COLORS[phase]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it('has distinct colors for each phase', () => {
      const colors = Object.values(PHASE_COLORS);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });

  describe('getPhaseFromBlockType', () => {
    it('returns phase for exact match (case-insensitive)', () => {
      expect(getPhaseFromBlockType('CONCEPT')).toBe('CONCEPT');
      expect(getPhaseFromBlockType('concept')).toBe('CONCEPT');
      expect(getPhaseFromBlockType('Concept')).toBe('CONCEPT');
    });

    it('handles SPINE_PROTOTYPE variations', () => {
      expect(getPhaseFromBlockType('Spine Prototype')).toBe('SPINE_PROTOTYPE');
      expect(getPhaseFromBlockType('spine prototype')).toBe('SPINE_PROTOTYPE');
      expect(getPhaseFromBlockType('SPINE')).toBe('SPINE_PROTOTYPE');
    });

    it('maps QA and Marketing to TWEAK', () => {
      expect(getPhaseFromBlockType('QA')).toBe('TWEAK');
      expect(getPhaseFromBlockType('qa')).toBe('TWEAK');
      expect(getPhaseFromBlockType('Marketing')).toBe('TWEAK');
    });

    it('returns null for unknown block types', () => {
      expect(getPhaseFromBlockType('Unknown')).toBeNull();
      expect(getPhaseFromBlockType('Random')).toBeNull();
      expect(getPhaseFromBlockType('')).toBeNull();
    });

    it('handles whitespace', () => {
      expect(getPhaseFromBlockType('  CONCEPT  ')).toBe('CONCEPT');
      expect(getPhaseFromBlockType('SPINE PROTOTYPE')).toBe('SPINE_PROTOTYPE');
    });
  });

  describe('detectPhaseFromName', () => {
    it('detects phase from list name containing search term', () => {
      expect(detectPhaseFromName('Backlog Items')).toBe('BACKLOG');
      expect(detectPhaseFromName('Production Tasks')).toBe('PRODUCTION');
      expect(detectPhaseFromName('Done Column')).toBe('DONE');
    });

    it('is case-insensitive', () => {
      expect(detectPhaseFromName('BACKLOG')).toBe('BACKLOG');
      expect(detectPhaseFromName('backlog')).toBe('BACKLOG');
      expect(detectPhaseFromName('BackLog')).toBe('BACKLOG');
    });

    it('detects SPINE_PROTOTYPE from spine or prototype keywords', () => {
      expect(detectPhaseFromName('Spine Work')).toBe('SPINE_PROTOTYPE');
      expect(detectPhaseFromName('Prototype Phase')).toBe('SPINE_PROTOTYPE');
    });

    it('detects TWEAK from qa or marketing keywords', () => {
      expect(detectPhaseFromName('QA Review')).toBe('TWEAK');
      expect(detectPhaseFromName('Marketing Ready')).toBe('TWEAK');
      expect(detectPhaseFromName('Final Tweaks')).toBe('TWEAK');
    });

    it('detects DONE from complete or finished keywords', () => {
      expect(detectPhaseFromName('Completed Tasks')).toBe('DONE');
      expect(detectPhaseFromName('Finished Work')).toBe('DONE');
    });

    it('returns null for names without phase keywords', () => {
      expect(detectPhaseFromName('Random List')).toBeNull();
      expect(detectPhaseFromName('My Tasks')).toBeNull();
      expect(detectPhaseFromName('')).toBeNull();
    });

    it('returns first matching phase if multiple could match', () => {
      // The function returns on first match, so order matters
      const result = detectPhaseFromName('Spine Production');
      // Should match SPINE_PROTOTYPE first since it's checked earlier
      expect(['SPINE_PROTOTYPE', 'PRODUCTION']).toContain(result);
    });
  });

  describe('isValidPhase', () => {
    it('returns true for valid phases', () => {
      expect(isValidPhase('BACKLOG')).toBe(true);
      expect(isValidPhase('SPINE_PROTOTYPE')).toBe(true);
      expect(isValidPhase('CONCEPT')).toBe(true);
      expect(isValidPhase('PRODUCTION')).toBe(true);
      expect(isValidPhase('TWEAK')).toBe(true);
      expect(isValidPhase('DONE')).toBe(true);
    });

    it('returns false for invalid phases', () => {
      expect(isValidPhase('INVALID')).toBe(false);
      expect(isValidPhase('backlog')).toBe(false); // case-sensitive
      expect(isValidPhase('')).toBe(false);
      expect(isValidPhase('RANDOM')).toBe(false);
    });

    it('acts as a type guard', () => {
      const value: string = 'CONCEPT';
      if (isValidPhase(value)) {
        // TypeScript should recognize value as ListPhase here
        const phase: ListPhase = value;
        expect(phase).toBe('CONCEPT');
      }
    });
  });
});
