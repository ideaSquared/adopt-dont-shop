import { describe, expect, it } from 'vitest';

import { mergeJson } from './json-merge.js';

describe('mergeJson', () => {
  it('merges a top-level key absent from the base into the result', () => {
    expect(mergeJson({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('overwrites a scalar value at a shared key', () => {
    expect(mergeJson({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
  });

  it('recursively merges nested objects instead of replacing the whole section', () => {
    const base = { personalInfo: { firstName: 'Ada', lastName: 'Lovelace' } };
    const patch = { personalInfo: { firstName: 'Grace' } };
    expect(mergeJson(base, patch)).toEqual({
      personalInfo: { firstName: 'Grace', lastName: 'Lovelace' },
    });
  });

  it('leaves top-level keys absent from the patch untouched', () => {
    const base = { personalInfo: { firstName: 'Ada' }, livingSituation: { housingType: 'house' } };
    const patch = { personalInfo: { firstName: 'Grace' } };
    expect(mergeJson(base, patch)).toEqual({
      personalInfo: { firstName: 'Grace' },
      livingSituation: { housingType: 'house' },
    });
  });

  it('replaces an array wholesale rather than merging element-by-element', () => {
    const base = { references: { personal: [{ name: 'Old' }] } };
    const patch = { references: { personal: [{ name: 'New' }] } };
    expect(mergeJson(base, patch)).toEqual({ references: { personal: [{ name: 'New' }] } });
  });

  it('replaces a value when its type changes between base and patch', () => {
    expect(mergeJson({ a: { nested: true } }, { a: 'now a string' })).toEqual({
      a: 'now a string',
    });
  });

  it('replaces null over an object and vice versa', () => {
    expect(mergeJson({ a: { nested: true } }, { a: null })).toEqual({ a: null });
    expect(mergeJson({ a: null }, { a: { nested: true } })).toEqual({ a: { nested: true } });
  });

  it('returns the patch unchanged when the base is not a plain object', () => {
    expect(mergeJson(null, { a: 1 })).toEqual({ a: 1 });
    expect(mergeJson([1, 2], { a: 1 })).toEqual({ a: 1 });
  });
});
