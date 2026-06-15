import { describe, expect, it } from 'vitest';

import { isLegalTransition, legalTargets } from './status-machine.js';

const ALL = ['draft', 'published', 'archived', 'scheduled'] as const;

describe('content status machine', () => {
  it('allows the conventional lifecycle transitions', () => {
    expect(isLegalTransition('draft', 'published')).toBe(true); // publish
    expect(isLegalTransition('published', 'draft')).toBe(true); // unpublish
    expect(isLegalTransition('draft', 'archived')).toBe(true); // archive
    expect(isLegalTransition('published', 'archived')).toBe(true); // archive
    expect(isLegalTransition('archived', 'draft')).toBe(true); // restore
    expect(isLegalTransition('scheduled', 'published')).toBe(true);
    expect(isLegalTransition('scheduled', 'draft')).toBe(true);
    expect(isLegalTransition('scheduled', 'archived')).toBe(true);
  });

  it('rejects illegal jumps', () => {
    expect(isLegalTransition('archived', 'published')).toBe(false); // can't re-publish directly
    expect(isLegalTransition('archived', 'archived')).toBe(false);
    expect(isLegalTransition('draft', 'scheduled')).toBe(false); // not via these handlers
    expect(isLegalTransition('published', 'scheduled')).toBe(false);
  });

  it('rejects every self-transition', () => {
    for (const s of ALL) {
      expect(isLegalTransition(s, s)).toBe(false);
    }
  });

  it('has a total transition table (every status has an entry)', () => {
    for (const s of ALL) {
      expect(Array.isArray(legalTargets(s))).toBe(true);
    }
  });
});
