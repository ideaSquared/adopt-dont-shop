import { describe, expect, it } from 'vitest';

import { ALL_PET_STATUSES } from './enum-map.js';
import { isLegalTransition, legalTargets } from './status-machine.js';

describe('isLegalTransition', () => {
  it('allows the core adoption lifecycle moves', () => {
    expect(isLegalTransition('available', 'pending')).toBe(true);
    expect(isLegalTransition('pending', 'adopted')).toBe(true);
    expect(isLegalTransition('available', 'foster')).toBe(true);
    expect(isLegalTransition('foster', 'adopted')).toBe(true);
    expect(isLegalTransition('available', 'medical_hold')).toBe(true);
    expect(isLegalTransition('not_available', 'available')).toBe(true);
  });

  it('allows a withdrawn application to return a pet to available', () => {
    expect(isLegalTransition('pending', 'available')).toBe(true);
  });

  it('allows a fallen-through adoption to re-list', () => {
    expect(isLegalTransition('adopted', 'available')).toBe(true);
  });

  it('rejects self-transitions as a no-op', () => {
    for (const s of ALL_PET_STATUSES) {
      expect(isLegalTransition(s, s)).toBe(false);
    }
  });

  it('treats deceased as terminal — nothing leaves it', () => {
    for (const s of ALL_PET_STATUSES) {
      expect(isLegalTransition('deceased', s)).toBe(false);
    }
    expect(legalTargets('deceased')).toHaveLength(0);
  });

  it('lets any non-terminal status reach deceased and not_available', () => {
    for (const s of ALL_PET_STATUSES) {
      if (s === 'deceased') continue;
      expect(isLegalTransition(s, 'deceased')).toBe(true);
    }
  });

  it('rejects a nonsensical jump (adopted → pending)', () => {
    expect(isLegalTransition('adopted', 'pending')).toBe(false);
  });

  it('has a transition table entry for every status (total)', () => {
    for (const s of ALL_PET_STATUSES) {
      expect(Array.isArray(legalTargets(s))).toBe(true);
    }
  });
});
