/**
 * Node version gate for `pnpm bootstrap` (ADS-1369).
 *
 * bootstrap.mjs runs before `pnpm install`, so it cannot import `semver`.
 * package.json `engines.node` is a space-separated list of comparators
 * (e.g. `>=22.22.0 <23.0.0`); that is the only range syntax supported here.
 * Anything else throws rather than silently accepting an unsupported Node.
 */

const VERSION = /^v?(\d+)\.(\d+)\.(\d+)/;
const COMPARATOR = /^(>=|<=|>|<|=)?v?(\d+)\.(\d+)\.(\d+)$/;

const OPERATORS = {
  '>=': comparison => comparison >= 0,
  '>': comparison => comparison > 0,
  '<=': comparison => comparison <= 0,
  '<': comparison => comparison < 0,
  '=': comparison => comparison === 0,
};

const parseVersion = text => {
  const match = VERSION.exec(text);
  if (!match) {
    throw new Error(`Unrecognised Node.js version: ${text}`);
  }
  return match.slice(1).map(Number);
};

// Negative, zero or positive, comparing major then minor then patch.
const compareVersions = (a, b) => a.reduce((result, part, index) => result || part - b[index], 0);

const satisfiesComparator = (version, comparator) => {
  const match = COMPARATOR.exec(comparator);
  if (!match) {
    throw new Error(`Unsupported engines.node comparator: "${comparator}"`);
  }
  const [, operator = '=', ...target] = match;
  return OPERATORS[operator](compareVersions(version, target.map(Number)));
};

/**
 * @param {string} versionText - e.g. the output of `node --version` ("v22.22.0")
 * @param {string} range - e.g. package.json `engines.node` (">=22.22.0 <23.0.0")
 * @returns {boolean} whether the version satisfies every comparator in the range
 */
export const satisfiesNodeRange = (versionText, range) => {
  const version = parseVersion(versionText);
  return range
    .trim()
    .split(/\s+/)
    .every(comparator => satisfiesComparator(version, comparator));
};
