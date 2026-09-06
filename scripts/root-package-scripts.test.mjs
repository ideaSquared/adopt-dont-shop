import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function readPkg(relDir) {
  return JSON.parse(readFileSync(join(ROOT, relDir, 'package.json'), 'utf8'));
}

// ADS-1282: bare `pnpm test` used to fan into the e2e Playwright suite via
// `turbo run test` (every workspace member with a `test` script, e2e
// included), which hangs/fails on a clean checkout with no browsers or
// running stack. The root `test` script must exclude e2e; `test:e2e` stays
// the deliberate way to run Playwright.
describe('root `pnpm test` script (ADS-1282)', () => {
  it('excludes the e2e package so a clean local run never launches Playwright', () => {
    const rootPkg = readPkg('.');
    expect(rootPkg.scripts.test).toContain('!@adopt-dont-shop/e2e');
  });

  it('keeps `pnpm test:e2e` targeting the e2e package', () => {
    const rootPkg = readPkg('.');
    expect(rootPkg.scripts['test:e2e']).toContain('@adopt-dont-shop/e2e');
  });

  it('the e2e package name matches the filter excluded above', () => {
    const e2ePkg = readPkg('e2e');
    expect(e2ePkg.name).toBe('@adopt-dont-shop/e2e');
  });
});
