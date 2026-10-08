import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { satisfiesNodeRange } from './node-engines.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENGINES_RANGE = '>=22.22.0 <23.0.0';

// `pnpm bootstrap` must accept exactly the Node versions `pnpm install` accepts
// per package.json `engines.node`. The original gate compared only the major
// version, so Node 22.0.0 - 22.21.x passed bootstrap and then tripped an
// unsupported-engine warning on install (ADS-1369).
describe('satisfiesNodeRange (ADS-1369)', () => {
  it('accepts the exact floor of the engines range', () => {
    expect(satisfiesNodeRange('v22.22.0', ENGINES_RANGE)).toBe(true);
  });

  it('accepts a newer patch and minor within the supported major', () => {
    expect(satisfiesNodeRange('v22.23.1', ENGINES_RANGE)).toBe(true);
    expect(satisfiesNodeRange('v22.30.0', ENGINES_RANGE)).toBe(true);
  });

  it('rejects a v22 release below the floor, which the major-only gate let through', () => {
    expect(satisfiesNodeRange('v22.21.9', ENGINES_RANGE)).toBe(false);
    expect(satisfiesNodeRange('v22.0.0', ENGINES_RANGE)).toBe(false);
  });

  it('rejects an older major', () => {
    expect(satisfiesNodeRange('v20.19.0', ENGINES_RANGE)).toBe(false);
  });

  it('rejects the next major, which is outside the exclusive upper bound', () => {
    expect(satisfiesNodeRange('v23.0.0', ENGINES_RANGE)).toBe(false);
  });

  it('accepts a version without the leading v', () => {
    expect(satisfiesNodeRange('22.22.0', ENGINES_RANGE)).toBe(true);
  });

  it('supports a single-comparator range', () => {
    expect(satisfiesNodeRange('v24.1.0', '>=22.22.0')).toBe(true);
    expect(satisfiesNodeRange('v22.21.0', '>=22.22.0')).toBe(false);
  });

  it('throws on range syntax it cannot evaluate instead of silently passing', () => {
    expect(() => satisfiesNodeRange('v22.22.0', '^22.22.0')).toThrow(/unsupported/i);
    expect(() => satisfiesNodeRange('v22.22.0', '>=22 || >=20')).toThrow(/unsupported/i);
  });

  it('throws on a version string it cannot parse', () => {
    expect(() => satisfiesNodeRange('not-a-version', ENGINES_RANGE)).toThrow(/version/i);
  });

  it('throws on trailing data after the patch instead of reading it as a stable release', () => {
    expect(() => satisfiesNodeRange('v22.22.0.1', ENGINES_RANGE)).toThrow(/version/i);
  });

  it('rejects a prerelease of an in-range version, as the engines semver check does', () => {
    expect(satisfiesNodeRange('v22.22.0-rc.1', ENGINES_RANGE)).toBe(false);
    expect(satisfiesNodeRange('v22.23.0-nightly20261001abcdef', ENGINES_RANGE)).toBe(false);
  });

  it("understands the repo's own engines.node and accepts the .nvmrc-pinned version", () => {
    const { engines } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    const pinned = readFileSync(join(ROOT, '.nvmrc'), 'utf-8').trim();

    expect(satisfiesNodeRange(pinned, engines.node)).toBe(true);
  });
});
