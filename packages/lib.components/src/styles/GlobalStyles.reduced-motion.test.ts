import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// CSS stubs in vitest cannot evaluate media queries, so assert the source of truth holds a global
// reduced-motion rule that covers animation, transition and smooth scrolling for every element.
describe('GlobalStyles honours prefers-reduced-motion', () => {
  const source = readFileSync(path.resolve(__dirname, './GlobalStyles.css.ts'), 'utf8');
  const block = source.match(
    /globalStyle\('\*, \*::before, \*::after', \{\s*'@media'[\s\S]*?\n\}\);/
  );

  it('has a global reduced-motion rule', () => {
    expect(block).not.toBeNull();
    expect(block?.[0]).toContain('(prefers-reduced-motion: reduce)');
  });

  it.each(['animationDuration', 'transitionDuration'])('stops %s', property => {
    expect(block?.[0]).toContain(`${property}:`);
  });

  it('stops smooth scrolling on the root element', () => {
    const html = source.match(/globalStyle\('html', \{[\s\S]*?\n\}\);/);
    expect(html?.[0]).toMatch(/prefers-reduced-motion: reduce[\s\S]*scrollBehavior: 'auto'/);
  });
});
