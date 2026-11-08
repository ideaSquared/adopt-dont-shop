import { describe, expect, it } from 'vitest';
import { didYouMean, levenshtein, suggest } from './catalog.js';
import { sampleIndex } from './test-support.js';

describe('typo suggestions', () => {
  it('measures edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('same', 'same')).toBe(0);
  });

  it('suggests only plausible matches', () => {
    expect(suggest('update-statu', ['list', 'update-status'])).toBe('update-status');
    expect(suggest('upd', ['list', 'update-status'])).toBe('update-status');
    expect(suggest('zzzzzz', ['list', 'update-status'])).toBeUndefined();
  });

  it('formats a hint or nothing', () => {
    expect(didYouMean('lst', ['list'], 'pnpm ops ')).toBe('Did you mean `pnpm ops list`?');
    expect(didYouMean('zzzzzz', ['list'])).toBe('');
  });
});

describe('catalog index', () => {
  it('looks things up by name', () => {
    expect(sampleIndex.service('pets')?.methods).toHaveLength(3);
    expect(sampleIndex.method('pets', 'nope')).toBeUndefined();
    expect(sampleIndex.enumDef('adopt_dont_shop.pets.v1.PetStatus')?.values).toHaveLength(3);
  });
});
