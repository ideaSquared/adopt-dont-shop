import { describe, expect, it } from 'vitest';

import { ALL_RESCUE_STATUSES } from './enum-map.js';
import { isLegalTransition, legalTargets } from './status-machine.js';

describe('isLegalTransition', () => {
  it('allows the core verification lifecycle', () => {
    expect(isLegalTransition('pending', 'verified')).toBe(true);
    expect(isLegalTransition('pending', 'rejected')).toBe(true);
    expect(isLegalTransition('verified', 'suspended')).toBe(true);
    expect(isLegalTransition('suspended', 'verified')).toBe(true);
    expect(isLegalTransition('verified', 'inactive')).toBe(true);
    expect(isLegalTransition('inactive', 'verified')).toBe(true);
  });

  it('allows a rejected rescue to re-apply (back to pending)', () => {
    expect(isLegalTransition('rejected', 'pending')).toBe(true);
  });

  it('rejects self-transitions', () => {
    for (const s of ALL_RESCUE_STATUSES) {
      expect(isLegalTransition(s, s)).toBe(false);
    }
  });

  it('rejects nonsensical jumps', () => {
    // pending → suspended bypasses the verify step
    expect(isLegalTransition('pending', 'suspended')).toBe(false);
    // verified → rejected (admin should suspend then re-evaluate, not reject)
    expect(isLegalTransition('verified', 'rejected')).toBe(false);
    // inactive → suspended (already off the platform)
    expect(isLegalTransition('inactive', 'suspended')).toBe(false);
  });

  it('has a transition table entry for every status (total)', () => {
    for (const s of ALL_RESCUE_STATUSES) {
      expect(Array.isArray(legalTargets(s))).toBe(true);
    }
  });
});
