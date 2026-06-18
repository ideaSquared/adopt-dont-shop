/**
 * Pure coverage-ratchet logic (ADS-796).
 *
 * Kept free of any filesystem / process access so it can be unit-tested as a
 * black box. The CLI wrapper in scripts/ratchet-coverage.mjs reads the v8
 * `coverage-summary.json` and the persisted `coverage-thresholds.json`, calls
 * the functions here, and writes the result back.
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
