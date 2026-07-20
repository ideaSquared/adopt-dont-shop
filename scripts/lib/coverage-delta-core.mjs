/**
 * Pure coverage-delta / PR-comment formatting logic (ADS-947).
 *
 * Kept free of any filesystem / network access so it can be unit-tested as a
 * black box. The orchestration (reading coverage-summary.json files off
 * disk, calling the GitHub API for job timings, upserting the sticky PR
 * comment) lives in the `Post/update coverage report comment` step of
 * .github/actions/coverage-report/action.yml, which imports these functions.
 *
 * All coverage values are percentages in the range [0, 100], shaped like
 * `measuredFromSummaryTotal()`'s return value from ratchet-coverage-core.mjs:
 * `{ statements?, branches?, functions?, lines? }`.
 */

const METRICS = ['statements', 'branches', 'functions', 'lines'];

// Below this, a coverage move is noise (rounding / CI variance), not a
// reportable delta.
const CHANGE_EPSILON = 0.1;

/**
 * Compare a package's before/after coverage totals and decide whether the
 * change is worth reporting.
 *
 * @param {Record<string, number>|undefined} before
 * @param {Record<string, number>} after
 * @returns {boolean}
 */
function hasReportableChange(before, after) {
  return METRICS.some(metric => {
    const afterValue = after[metric];
    if (typeof afterValue !== 'number') {
      return false;
    }
    const beforeValue = before?.[metric];
    if (typeof beforeValue !== 'number') {
      // No baseline for this metric — a newly-measured package/metric is
      // always reportable.
      return true;
    }
    return Math.abs(afterValue - beforeValue) >= CHANGE_EPSILON;
  });
}

/**
 * Compute per-package coverage deltas between a baseline (main) snapshot and
 * the current run, keeping only packages whose coverage actually changed.
 *
 * @param {Record<string, Record<string, number>>} baselineByPackage
 * @param {Record<string, Record<string, number>>} currentByPackage
 * @returns {Array<{ package: string, before: Record<string, number>|undefined, after: Record<string, number> }>}
 *   Sorted by package name. A package with no baseline entry is reported as
 *   new (before: undefined). A package present only in the baseline (removed
 *   or not run this build) is omitted — there's nothing current to show.
 */
export function computePackageDeltas(baselineByPackage, currentByPackage) {
  return Object.keys(currentByPackage)
    .filter(pkg => hasReportableChange(baselineByPackage[pkg], currentByPackage[pkg]))
    .sort((a, b) => a.localeCompare(b))
    .map(pkg => ({
      package: pkg,
      before: baselineByPackage[pkg],
      after: currentByPackage[pkg],
    }));
}

function formatMetric(before, after) {
  if (typeof after !== 'number') {
    return 'n/a';
  }
  if (typeof before !== 'number') {
    return `${after.toFixed(1)}% (new)`;
  }
  const delta = after - before;
  const sign = delta > 0 ? '+' : '';
  return `${after.toFixed(1)}% (${sign}${delta.toFixed(1)})`;
}

/**
 * Render the per-package coverage-delta rows as a Markdown table.
 *
 * @param {ReturnType<typeof computePackageDeltas>} rows
 * @returns {string}
 */
export function formatCoverageTable(rows) {
  if (rows.length === 0) {
    return '_No package coverage changes vs the base branch._';
  }
  const header =
    '| Package | Statements | Branches | Functions | Lines |\n| --- | --- | --- | --- | --- |';
  const body = rows
    .map(row => {
      const cells = METRICS.map(metric => formatMetric(row.before?.[metric], row.after[metric]));
      return `| ${row.package} | ${cells.join(' | ')} |`;
    })
    .join('\n');
  return `${header}\n${body}`;
}

/**
 * @param {number} ms
 * @returns {string} e.g. "3m 12s" or "45s"
 */
export function formatDurationLabel(ms) {
  if (typeof ms !== 'number' || Number.isNaN(ms) || ms < 0) {
    return 'n/a';
  }
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/**
 * Render per-job wall-clock timings as a Markdown table, slowest first.
 *
 * @param {Array<{ name: string, durationMs: number, conclusion?: string, status: string }>} jobs
 * @returns {string}
 */
export function formatJobTimingsTable(jobs) {
  if (jobs.length === 0) {
    return '_No job timing data available._';
  }
  const header = '| Job | Duration | Result |\n| --- | --- | --- |';
  const body = [...jobs]
    .sort((a, b) => b.durationMs - a.durationMs)
    .map(
      job =>
        `| ${job.name} | ${formatDurationLabel(job.durationMs)} | ${job.conclusion ?? job.status} |`
    )
    .join('\n');
  return `${header}\n${body}`;
}

// Marker used to find (and overwrite in place) this bot's own comment on
// later pushes, instead of posting a new one each time.
export const COMMENT_MARKER = '<!-- ads-ci-coverage-report -->';

/**
 * Assemble the full sticky PR comment body.
 *
 * @param {{ coverageTable: string, timingsTable: string, libDistCacheHit: boolean|undefined }} params
 * @returns {string}
 */
export function buildCommentBody({ coverageTable, timingsTable, libDistCacheHit }) {
  const cacheLabel =
    typeof libDistCacheHit === 'boolean' ? (libDistCacheHit ? 'hit' : 'miss') : 'unknown';
  return [
    COMMENT_MARKER,
    '## CI report',
    '',
    '**Coverage delta vs main** (only packages whose coverage changed)',
    '',
    coverageTable,
    '',
    '<details>',
    `<summary>CI health — job timings (lib-dist cache: ${cacheLabel})</summary>`,
    '',
    timingsTable,
    '',
    '</details>',
    '',
    '_Informational only — does not block merge._',
  ].join('\n');
}
