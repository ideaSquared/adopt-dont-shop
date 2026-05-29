import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// Keyboard a11y: outline:none was previously stripping the browser-default
// focus ring without providing a replacement. We standardised on the
// :focus-visible pattern so keyboard users still get a visible focus
// indicator while mouse focus stays clean. This is a representative
// assertion for the wider sweep across app.admin/app.client/app.rescue
// css.ts files.
describe('ActionMenu css honours the :focus-visible focus-ring pattern', () => {
  it('declares a :focus-visible block on the trigger style', () => {
    const source = readFileSync(path.resolve(__dirname, './ActionMenu.css.ts'), 'utf8');

    expect(source).toMatch(/':focus-visible'/);
    expect(source).not.toMatch(/'\:focus'\s*:\s*\{[^{}]*outline:\s*'none'/);
  });
});
