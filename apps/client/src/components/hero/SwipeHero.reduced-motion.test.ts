import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// Vestibular sensitivity: the hero is the highest-traffic surface on the
// client app. Its infinite float, pulse, shimmer and floatIcon animations
// must yield to prefers-reduced-motion: reduce. CSS stubs in vitest can't
// compute media-query-aware styles, so we assert the source-of-truth
// contains the guard pattern for each of the animated styles introduced
// by C3-6 tails (PR #677 deferred-items).
describe('SwipeHero honours prefers-reduced-motion', () => {
  const source = readFileSync(path.resolve(__dirname, './SwipeHero.css.ts'), 'utf8');

  const guard = /'\(prefers-reduced-motion: reduce\)':\s*\{\s*animation:\s*['"]none['"]/;

  it('count of reduced-motion guards covers every animation hotspot', () => {
    const guards = source.match(/\(prefers-reduced-motion: reduce\)/g) ?? [];
    // heroContainer::before, primaryButton, primaryButton::before,
    // primaryButtonIcon, sparkle = 5 hotspots.
    expect(guards.length).toBeGreaterThanOrEqual(5);
  });

  it.each([['primaryButton'], ['primaryButtonIcon'], ['sparkle']])(
    'guards the %s style block',
    exportName => {
      const blockMatch = source.match(
        new RegExp(`export const ${exportName} = style\\(\\{[\\s\\S]*?\\n\\}\\);`)
      );
      expect(blockMatch, `Expected to find export ${exportName}`).not.toBeNull();
      const block = blockMatch?.[0] ?? '';
      expect(block).toMatch(guard);
    }
  );
});
