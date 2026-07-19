import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  computeCoverage,
  discoverComponents,
  formatReport,
  ratchetFloor,
} from './check-storybook-coverage.mjs';

describe('discoverComponents', () => {
  let uiDir;

  beforeEach(() => {
    uiDir = mkdtempSync(join(tmpdir(), 'storybook-coverage-'));
  });

  afterEach(() => {
    rmSync(uiDir, { recursive: true, force: true });
  });

  it('finds a flat component with a matching stories file', () => {
    writeFileSync(join(uiDir, 'Button.tsx'), 'export const Button = () => null;');
    writeFileSync(join(uiDir, 'Button.stories.tsx'), 'export default {};');

    expect(discoverComponents(uiDir)).toEqual([{ name: 'Button', hasStories: true }]);
  });

  it('finds a flat component with no stories file', () => {
    writeFileSync(join(uiDir, 'Avatar.tsx'), 'export const Avatar = () => null;');

    expect(discoverComponents(uiDir)).toEqual([{ name: 'Avatar', hasStories: false }]);
  });

  it('ignores .test.tsx and .css.ts siblings when discovering flat components', () => {
    writeFileSync(join(uiDir, 'Badge.tsx'), 'export const Badge = () => null;');
    writeFileSync(join(uiDir, 'Badge.test.tsx'), 'test();');
    writeFileSync(join(uiDir, 'Badge.css.ts'), 'export const badge = {};');

    expect(discoverComponents(uiDir)).toEqual([{ name: 'Badge', hasStories: false }]);
  });

  it('finds a directory-style component (Name/Name.tsx) with its stories file', () => {
    mkdirSync(join(uiDir, 'DateTime'));
    writeFileSync(join(uiDir, 'DateTime', 'DateTime.tsx'), 'export const DateTime = () => null;');
    writeFileSync(join(uiDir, 'DateTime', 'DateTime.test.tsx'), 'test();');
    writeFileSync(join(uiDir, 'DateTime', 'DateTime.stories.tsx'), 'export default {};');

    expect(discoverComponents(uiDir)).toEqual([{ name: 'DateTime', hasStories: true }]);
  });

  it('skips a directory that has no matching <Name>.tsx component file', () => {
    mkdirSync(join(uiDir, 'utils'));
    writeFileSync(join(uiDir, 'utils', 'helpers.ts'), 'export const noop = () => {};');

    expect(discoverComponents(uiDir)).toEqual([]);
  });

  it('sorts results alphabetically by component name', () => {
    writeFileSync(join(uiDir, 'Zeta.tsx'), '');
    writeFileSync(join(uiDir, 'Alpha.tsx'), '');

    expect(discoverComponents(uiDir).map(c => c.name)).toEqual(['Alpha', 'Zeta']);
  });
});

describe('computeCoverage', () => {
  it('computes percentage and lists components missing stories', () => {
    const result = computeCoverage([
      { name: 'Button', hasStories: true },
      { name: 'Avatar', hasStories: false },
      { name: 'Badge', hasStories: false },
    ]);

    expect(result).toEqual({
      total: 3,
      withStories: 1,
      missing: ['Avatar', 'Badge'],
      percentage: expect.closeTo(33.33, 1),
    });
  });

  it('reports 100% coverage when there are no components', () => {
    expect(computeCoverage([])).toEqual({ total: 0, withStories: 0, missing: [], percentage: 100 });
  });
});

describe('ratchetFloor', () => {
  it('raises the floor towards measured coverage', () => {
    expect(ratchetFloor(10, 25)).toBe(25);
  });

  it('never lowers an existing floor', () => {
    expect(ratchetFloor(30, 10)).toBe(30);
  });

  it('applies the safety margin before raising', () => {
    expect(ratchetFloor(0, 25, 5)).toBe(20);
  });
});

describe('formatReport', () => {
  it('lists missing components when coverage is incomplete', () => {
    const report = formatReport({
      total: 2,
      withStories: 1,
      missing: ['Avatar'],
      percentage: 50,
    });
    expect(report).toContain('50.0%');
    expect(report).toContain('Avatar');
  });

  it('reports full coverage with no missing list', () => {
    const report = formatReport({ total: 2, withStories: 2, missing: [], percentage: 100 });
    expect(report).toContain('Every UI component has a stories file.');
  });
});
