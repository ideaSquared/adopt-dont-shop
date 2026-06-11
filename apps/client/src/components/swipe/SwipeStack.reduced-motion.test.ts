import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// Vestibular sensitivity: users with prefers-reduced-motion: reduce should
// not see the infinite shimmer on the swipe skeleton. The CSS stub used in
// vitest can't compute media-query-aware styles so we assert the source-of-
// truth contains the guard.
describe('SwipeStack skeleton card honours prefers-reduced-motion', () => {
  it('disables the shimmer animation when prefers-reduced-motion is reduce', () => {
    const source = readFileSync(path.resolve(__dirname, './SwipeStack.css.ts'), 'utf8');

    const skeletonBlock = source.match(/export const skeletonCard = style\(\{[\s\S]*?\}\);/);
    expect(skeletonBlock).not.toBeNull();
    const block = skeletonBlock?.[0] ?? '';

    expect(block).toMatch(/'\(prefers-reduced-motion: reduce\)':\s*\{\s*animation:\s*['"]none['"]/);
  });
});
