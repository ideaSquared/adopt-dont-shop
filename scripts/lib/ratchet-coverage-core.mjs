/**
 * Pure coverage-ratchet logic (ADS-796 / ADS-1004).
 *
 * Kept free of any filesystem / process access so it can be unit-tested as a
 * black box. The CLI wrapper in scripts/ratchet-coverage.mjs reads a
 * package's v8 `coverage-summary.json` and the thresholds already declared
 * in that package's own `vitest.config.ts`, calls the functions here, and
 * writes the raised thresholds back into that same file. There is no
 * persisted root thresholds file — each `services/*` / `packages/lib.*`
 * package's `vitest.config.ts` is the single source of truth for its floor.
 *
 * The ratchet rule is intentionally one-directional:
 *
 *   - NEVER lower an existing threshold (coverage regressions stay blocked).
 *   - Raise a threshold towards the freshly measured coverage, minus a small
 *     safety margin, so day-to-day CI variance does not flip the build red.
 *   - Only raise when the headroom (measured - current threshold) exceeds the
 *     margin; otherwise leave the threshold untouched (no churn).
 *
 * All values are coverage percentages in the range [0, 100].
 */

export const COVERAGE_METRICS = ['statements', 'branches', 'functions', 'lines'];

const DEFAULT_MARGIN = 1;

/**
 * Ratchet a single metric.
 *
 * @param {number} current  Existing persisted threshold (defaults to 0).
 * @param {number} measured Freshly measured coverage percentage.
 * @param {number} margin   Safety margin subtracted from `measured`.
 * @returns {number} The new threshold — always >= current, never above the
 *   measured value minus the margin (floored at 0).
 */
export function ratchetMetric(current, measured, margin = DEFAULT_MARGIN) {
  const target = Math.max(0, Math.floor(measured - margin));
  if (target <= current) {
    return current;
  }
  return target;
}

/**
 * Ratchet a full set of thresholds against a measured-coverage summary.
 *
 * @param {Record<string, number>} current  Existing thresholds (missing
 *   metrics are treated as 0).
 * @param {Record<string, number>} measured Measured coverage percentages.
 * @param {number} margin Safety margin.
 * @returns {Record<string, number>} A new thresholds object (input is not
 *   mutated). Metrics absent from `measured` keep their current value.
 */
export function ratchetThresholds(current, measured, margin = DEFAULT_MARGIN) {
  return COVERAGE_METRICS.reduce((acc, metric) => {
    const currentValue = current[metric] ?? 0;
    const measuredValue = measured[metric];
    if (typeof measuredValue !== 'number' || Number.isNaN(measuredValue)) {
      return { ...acc, [metric]: currentValue };
    }
    return { ...acc, [metric]: ratchetMetric(currentValue, measuredValue, margin) };
  }, {});
}

/**
 * Extract the percentage-per-metric map from a v8/istanbul
 * `coverage-summary.json` `total` block (`{ lines: { pct }, ... }`).
 *
 * @param {Record<string, { pct?: number }>} total
 * @returns {Record<string, number>}
 */
export function measuredFromSummaryTotal(total) {
  return COVERAGE_METRICS.reduce((acc, metric) => {
    const pct = total?.[metric]?.pct;
    if (typeof pct !== 'number') {
      return acc;
    }
    return { ...acc, [metric]: pct };
  }, {});
}

// Matches a `<metric>: <number>,` line inside a `thresholds: { ... }` block
// in a vitest.config.ts source file, e.g. `        statements: 94,`.
function thresholdLineRegExp(metric) {
  return new RegExp(`^([ \\t]*${metric}:\\s*)-?\\d+(?:\\.\\d+)?(,?[ \\t]*)$`, 'm');
}

/**
 * Read the coverage thresholds a package's `vitest.config.ts` source
 * declares for itself (ADS-1004). Every workspace package's `vitest.config.ts`
 * is the source of truth for its own floor — this scans the raw source text
 * for `<metric>: <number>,` lines rather than executing the TypeScript, so
 * it stays dependency-free and safe to run before `pnpm install`.
 *
 * @param {string} source Contents of a `vitest.config.ts` file.
 * @returns {Record<string, number>} Metrics declared in `source`; a metric
 *   with no matching line is omitted (not defaulted to 0), so callers can
 *   distinguish "declared as 0" from "never declared".
 */
export function extractThresholdsFromSource(source) {
  return COVERAGE_METRICS.reduce((acc, metric) => {
    const match = source.match(thresholdLineRegExp(metric));
    if (!match) {
      return acc;
    }
    return { ...acc, [metric]: Number(match[0].match(/-?\d+(?:\.\d+)?/)[0]) };
  }, {});
}

/**
 * Rewrite the `<metric>: <number>,` threshold lines in a `vitest.config.ts`
 * source to the given values, preserving everything else (comments,
 * formatting, surrounding config) byte-for-byte. A metric with no matching
 * line in `source` is left untouched — callers should first confirm the
 * metric is declared (see `extractThresholdsFromSource`) before ratcheting.
 *
 * @param {string} source Contents of a `vitest.config.ts` file.
 * @param {Record<string, number>} thresholds New value per metric.
 * @returns {string} The updated source.
 */
export function updateThresholdsInSource(source, thresholds) {
  return COVERAGE_METRICS.reduce((text, metric) => {
    if (!(metric in thresholds)) {
      return text;
    }
    return text.replace(
      thresholdLineRegExp(metric),
      (_line, prefix, suffix) => `${prefix}${thresholds[metric]}${suffix}`
    );
  }, source);
}
