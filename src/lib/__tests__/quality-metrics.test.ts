import { describe, expect, it } from 'vitest';
import {
  extractLinkedUserStoryId,
  getStoryPointsFromTaskData,
} from '../quality-metrics';

describe('quality-metrics helpers', () => {
  describe('getStoryPointsFromTaskData', () => {
    it('returns 0 for missing or invalid taskData', () => {
      expect(getStoryPointsFromTaskData(null)).toBe(0);
      expect(getStoryPointsFromTaskData('invalid' as never)).toBe(0);
      expect(getStoryPointsFromTaskData({})).toBe(0);
      expect(getStoryPointsFromTaskData({ storyPoints: '3' } as never)).toBe(0);
    });

    it('normalizes numeric story points with lower bound 0', () => {
      expect(getStoryPointsFromTaskData({ storyPoints: 5 } as never)).toBe(5);
      expect(getStoryPointsFromTaskData({ storyPoints: 0 } as never)).toBe(0);
      expect(getStoryPointsFromTaskData({ storyPoints: -2 } as never)).toBe(0);
    });
  });

  describe('extractLinkedUserStoryId', () => {
    it('returns null when id is missing or invalid', () => {
      expect(extractLinkedUserStoryId(null)).toBeNull();
      expect(extractLinkedUserStoryId({})).toBeNull();
      expect(extractLinkedUserStoryId({ linkedUserStoryId: 123 } as never)).toBeNull();
      expect(extractLinkedUserStoryId({ linkedUserStoryId: '   ' })).toBeNull();
    });

    it('returns trimmed linked user story id', () => {
      expect(
        extractLinkedUserStoryId({ linkedUserStoryId: '  story-123  ' })
      ).toBe('story-123');
    });
  });
});
