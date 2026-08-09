import { describe, expect, it } from 'vitest';

import { seededUuid } from './deterministic-id.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('seededUuid', () => {
  it('is a well-formed v4-shaped UUID', () => {
    expect(seededUuid('pet-0')).toMatch(UUID_V4);
  });

  it('is deterministic — the same key always yields the same id', () => {
    expect(seededUuid('rescue-3')).toBe(seededUuid('rescue-3'));
  });

  it('yields distinct ids for distinct keys', () => {
    expect(seededUuid('pet-0')).not.toBe(seededUuid('pet-1'));
    expect(seededUuid('adopter-0')).not.toBe(seededUuid('rescue-0'));
  });
});
