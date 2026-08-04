import { describe, expect, it } from 'vitest';

import {
  extractThresholdsFromSource,
  measuredFromSummaryTotal,
  ratchetMetric,
  ratchetThresholds,
  updateThresholdsInSource,
} from './ratchet-coverage-core.mjs';

describe('ratchetMetric', () => {
  it('raises the threshold towards measured coverage minus the safety margin', () => {
    expect(ratchetMetric(0, 95.87)).toBe(94);
  });

  it('never lowers an existing threshold when coverage regresses', () => {
    expect(ratchetMetric(90, 70)).toBe(90);
  });

  it('leaves the threshold unchanged when headroom is within the margin', () => {
    // measured 90.4, margin 1 -> target 89, which is below the current 90.
    expect(ratchetMetric(90, 90.4)).toBe(90);
  });

  it('floors the new threshold at 0 for tiny coverage', () => {
    expect(ratchetMetric(0, 0.5)).toBe(0);
  });

  it('honours a custom margin', () => {
    expect(ratchetMetric(0, 95.87, 5)).toBe(90);
  });
});

describe('ratchetThresholds', () => {
  it('ratchets every metric independently and never lowers any', () => {
    const current = { statements: 80, branches: 95, functions: 50, lines: 80 };
    const measured = { statements: 95.5, branches: 60, functions: 100, lines: 95.5 };

    expect(ratchetThresholds(current, measured)).toEqual({
      statements: 94,
      branches: 95, // measured regressed — kept
      functions: 99,
      lines: 94,
    });
  });

  it('treats missing current metrics as a 0 floor', () => {
    const measured = { statements: 88.66, branches: 80.76, functions: 98.41, lines: 88.43 };

    expect(ratchetThresholds({}, measured)).toEqual({
      statements: 87,
      branches: 79,
      functions: 97,
      lines: 87,
    });
  });

  it('keeps the current value for a metric absent from the measurement', () => {
    const current = { statements: 50, branches: 50, functions: 50, lines: 50 };
    const measured = { statements: 90 };

    expect(ratchetThresholds(current, measured)).toEqual({
      statements: 89,
      branches: 50,
      functions: 50,
      lines: 50,
    });
  });

  it('does not mutate the inputs', () => {
    const current = { statements: 10, branches: 10, functions: 10, lines: 10 };
    const measured = { statements: 90, branches: 90, functions: 90, lines: 90 };

    ratchetThresholds(current, measured);

    expect(current).toEqual({ statements: 10, branches: 10, functions: 10, lines: 10 });
  });
});

describe('measuredFromSummaryTotal', () => {
  it('extracts the pct of each metric from a v8 coverage-summary total block', () => {
    const total = {
      lines: { total: 100, covered: 96, pct: 96 },
      statements: { total: 100, covered: 95, pct: 95 },
      functions: { total: 10, covered: 10, pct: 100 },
      branches: { total: 20, covered: 18, pct: 90 },
    };

    expect(measuredFromSummaryTotal(total)).toEqual({
      lines: 96,
      statements: 95,
      functions: 100,
      branches: 90,
    });
  });

  it('omits metrics whose pct is absent', () => {
    const total = { lines: { pct: 80 }, statements: {} };

    expect(measuredFromSummaryTotal(total)).toEqual({ lines: 80 });
  });
});

describe('extractThresholdsFromSource (ADS-1004)', () => {
  it('reads every metric declared in a thresholds block', () => {
    const source = [
      "import { defineServiceConfig } from '../../vitest.shared.config';",
      '',
      'export default defineServiceConfig({',
      '  test: {',
      '    coverage: {',
      '      thresholds: {',
      '        statements: 91,',
      '        branches: 95,',
      '        functions: 89,',
      '        lines: 91,',
      '      },',
      '    },',
      '  },',
      '});',
      '',
    ].join('\n');

    expect(extractThresholdsFromSource(source)).toEqual({
      statements: 91,
      branches: 95,
      functions: 89,
      lines: 91,
    });
  });

  it('reads decimal threshold values', () => {
    const source = '        statements: 62.5,\n        branches: 41,\n';
    expect(extractThresholdsFromSource(source)).toEqual({ statements: 62.5, branches: 41 });
  });

  it('omits metrics with no matching line rather than defaulting to 0', () => {
    const source = 'export default defineServiceConfig();\n';
    expect(extractThresholdsFromSource(source)).toEqual({});
  });

  it('is indifferent to indentation depth', () => {
    const source = '          statements: 85,\n          branches: 72,\n';
    expect(extractThresholdsFromSource(source)).toEqual({ statements: 85, branches: 72 });
  });
});

describe('updateThresholdsInSource (ADS-1004)', () => {
  it('rewrites declared threshold values while preserving surrounding source', () => {
    const source = [
      '      thresholds: {',
      '        statements: 91,',
      '        branches: 95,',
      '        functions: 89,',
      '        lines: 91,',
      '      },',
    ].join('\n');

    const updated = updateThresholdsInSource(source, {
      statements: 92,
      branches: 96,
      functions: 90,
      lines: 92,
    });

    expect(updated).toBe(
      [
        '      thresholds: {',
        '        statements: 92,',
        '        branches: 96,',
        '        functions: 90,',
        '        lines: 92,',
        '      },',
      ].join('\n')
    );
  });

  it('leaves a metric untouched when it is absent from the update', () => {
    const source = '        statements: 91,\n        branches: 95,\n';
    expect(updateThresholdsInSource(source, { statements: 92 })).toBe(
      '        statements: 92,\n        branches: 95,\n'
    );
  });

  it('is a no-op when no threshold line matches', () => {
    const source = 'export default defineServiceConfig();\n';
    expect(updateThresholdsInSource(source, { statements: 92 })).toBe(source);
  });

  it('round-trips with extractThresholdsFromSource', () => {
    const source = '        statements: 80,\n        branches: 80,\n        functions: 80,\n        lines: 80,\n';
    const next = { statements: 85, branches: 81, functions: 83, lines: 84 };
    const updated = updateThresholdsInSource(source, next);
    expect(extractThresholdsFromSource(updated)).toEqual(next);
  });
});
