import { describe, expect, it } from 'vitest';

import {
  buildCommentBody,
  COMMENT_MARKER,
  computePackageDeltas,
  formatCoverageTable,
  formatDurationLabel,
  formatJobTimingsTable,
} from './coverage-delta-core.mjs';

describe('computePackageDeltas', () => {
  it('reports a package whose statements moved by more than the noise margin', () => {
    const baseline = { 'lib.api': { statements: 90, branches: 80, functions: 90, lines: 90 } };
    const current = { 'lib.api': { statements: 92, branches: 80, functions: 90, lines: 90 } };

    expect(computePackageDeltas(baseline, current)).toEqual([
      { package: 'lib.api', before: baseline['lib.api'], after: current['lib.api'] },
    ]);
  });

  it('omits a package whose coverage is unchanged within the noise margin', () => {
    const baseline = { 'lib.api': { statements: 90, branches: 80, functions: 90, lines: 90 } };
    const current = { 'lib.api': { statements: 90.05, branches: 80, functions: 90, lines: 90 } };

    expect(computePackageDeltas(baseline, current)).toEqual([]);
  });

  it('reports a package with no baseline as new', () => {
    const current = { 'lib.new': { statements: 75, branches: 60, functions: 80, lines: 75 } };

    expect(computePackageDeltas({}, current)).toEqual([
      { package: 'lib.new', before: undefined, after: current['lib.new'] },
    ]);
  });

  it('omits a package present only in the baseline (removed / not run this build)', () => {
    const baseline = { 'lib.gone': { statements: 90, branches: 80, functions: 90, lines: 90 } };

    expect(computePackageDeltas(baseline, {})).toEqual([]);
  });

  it('sorts results by package name', () => {
    const current = {
      'lib.zeta': { statements: 50, branches: 50, functions: 50, lines: 50 },
      'lib.alpha': { statements: 50, branches: 50, functions: 50, lines: 50 },
    };

    expect(computePackageDeltas({}, current).map(row => row.package)).toEqual([
      'lib.alpha',
      'lib.zeta',
    ]);
  });
});

describe('formatCoverageTable', () => {
  it('renders a placeholder when there are no reportable deltas', () => {
    expect(formatCoverageTable([])).toBe('_No package coverage changes vs the base branch._');
  });

  it('renders before/after with a signed delta for an existing package', () => {
    const table = formatCoverageTable([
      {
        package: 'lib.api',
        before: { statements: 90, branches: 80, functions: 90, lines: 90 },
        after: { statements: 92.5, branches: 80, functions: 90, lines: 89.2 },
      },
    ]);

    expect(table).toContain(
      '| lib.api | 92.5% (+2.5) | 80.0% (0.0) | 90.0% (0.0) | 89.2% (-0.8) |'
    );
  });

  it('marks a package with no baseline as new', () => {
    const table = formatCoverageTable([
      {
        package: 'lib.new',
        before: undefined,
        after: { statements: 75, branches: 60, functions: 80, lines: 75 },
      },
    ]);

    expect(table).toContain('75.0% (new)');
  });
});

describe('formatDurationLabel', () => {
  it('formats sub-minute durations as seconds', () => {
    expect(formatDurationLabel(45_000)).toBe('45s');
  });

  it('formats multi-minute durations as minutes and seconds', () => {
    expect(formatDurationLabel(192_000)).toBe('3m 12s');
  });

  it('returns n/a for missing or invalid input', () => {
    expect(formatDurationLabel(undefined)).toBe('n/a');
    expect(formatDurationLabel(-5)).toBe('n/a');
    expect(formatDurationLabel(Number.NaN)).toBe('n/a');
  });
});

describe('formatJobTimingsTable', () => {
  it('renders a placeholder when there is no timing data', () => {
    expect(formatJobTimingsTable([])).toBe('_No job timing data available._');
  });

  it('sorts jobs slowest-first', () => {
    const table = formatJobTimingsTable([
      { name: 'Library Tests', durationMs: 30_000, status: 'completed', conclusion: 'success' },
      {
        name: 'E2E Tests (Playwright)',
        durationMs: 600_000,
        status: 'completed',
        conclusion: 'success',
      },
    ]);

    const lines = table.split('\n');
    expect(lines[2]).toContain('E2E Tests (Playwright)');
    expect(lines[3]).toContain('Library Tests');
  });
});

describe('buildCommentBody', () => {
  it('includes the sticky marker so the comment can be found and updated in place', () => {
    const body = buildCommentBody({
      coverageTable: 'table',
      timingsTable: 'timings',
      libDistCacheHit: true,
    });

    expect(body.startsWith(COMMENT_MARKER)).toBe(true);
    expect(body).toContain('lib-dist cache: hit');
    expect(body).toContain('does not block merge');
  });

  it('reports the cache status as unknown when not provided', () => {
    const body = buildCommentBody({
      coverageTable: 't',
      timingsTable: 'j',
      libDistCacheHit: undefined,
    });

    expect(body).toContain('lib-dist cache: unknown');
  });
});
