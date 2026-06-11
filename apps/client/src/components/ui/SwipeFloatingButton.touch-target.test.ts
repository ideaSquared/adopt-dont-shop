import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// WCAG 2.5.5 AA recommends 44x44 minimum touch target. This test reads the
// vanilla-extract source so the constraint is enforced regardless of how the
// test environment stubs the CSS modules.
describe('SwipeFloatingButton close button touch target', () => {
  it('declares a 44x44 minimum tap area on the close button', () => {
    const source = readFileSync(path.resolve(__dirname, './SwipeFloatingButton.css.ts'), 'utf8');

    const closeButtonBlock = source.match(/export const closeButton = style\(\{[\s\S]*?\}\);/);
    expect(closeButtonBlock).not.toBeNull();
    const block = closeButtonBlock?.[0] ?? '';

    expect(block).toMatch(/minWidth:\s*['"]44px['"]/);
    expect(block).toMatch(/minHeight:\s*['"]44px['"]/);
  });
});
