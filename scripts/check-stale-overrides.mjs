#!/usr/bin/env node
/**
 * Stale pnpm.overrides reporter (ADS-1112).
 *
 * The pnpm.overrides block pins ~20 transitive packages to CVE-patched
 * versions. Nothing detected when upstream had released far enough past the
 * vulnerable range that a pin became redundant, so stale pins were pruned only
 * by hand (ADS-1053). This is a NON-BLOCKING report: for each versioned
 * override it fetches the package's latest published version and flags pins the
 * ecosystem can now satisfy on its own — candidates a maintainer should
 * re-evaluate and drop once every transitive consumer resolves a safe version
 * without the override forcing it.
 *
 *   node scripts/check-stale-overrides.mjs        # human report
 *   node scripts/check-stale-overrides.mjs --json  # machine-readable
 *
 * Exit code is always 0 (informational). Network access is required; fetch
 * failures are reported per-package and never fail the run. The version logic
 * is factored into pure, unit-tested helpers below; only fetchLatestVersion
 * touches the network.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import semver from 'semver';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// The pnpm nested-override separator is a `>` that begins a child package spec
// (followed by a name char), NOT a `>`/`>=` version operator (followed by `=`
// or a digit) — so `svgo@>=3.0.0 <3.3.4` is a versioned key, not a nested one.
const NESTED_SEPARATOR = />(?=[a-zA-Z@])/;

// Split a pnpm.overrides key into { name, range, nested }. `range` is the
// version selector the override matches against (the vulnerable range for CVE
// pins), or null for a bare key. Nested selectors (`parent>child`) carry no
// standalone range and are skipped by the reporter.
export function parseOverrideKey(key) {
  const gt = key.search(NESTED_SEPARATOR);
  if (gt !== -1) {
    const parent = key.slice(0, gt);
    const at = parent.lastIndexOf('@');
    return { name: (at > 0 ? parent.slice(0, at) : parent).trim(), range: null, nested: true };
  }
  const at = key.lastIndexOf('@');
  if (at > 0)
    return { name: key.slice(0, at).trim(), range: key.slice(at + 1).trim(), nested: false };
  return { name: key.trim(), range: null, nested: false };
}

// Decide whether a pin is a staleness candidate. The override is only doing
// work while the ecosystem could still resolve a version inside the vulnerable
// `range`; once upstream's latest release sits at or above the forced version
// AND outside the vulnerable range, a fresh resolution lands on a safe version
// on its own, so the pin is a candidate for removal. Pure + semver-based so it
// is unit-testable without the network.
export function classifyOverride({ name, range, pinnedVersion, latestVersion }) {
  const latest = semver.coerce(latestVersion);
  const pinned = semver.coerce(pinnedVersion);
  if (!latest) return { name, status: 'unknown', pinnedVersion, latestVersion };

  const upstreamAheadOfPin = pinned ? semver.gte(latest, pinned) : true;
  // If the key carried a vulnerable range, the pin is only redundant when the
  // latest release is outside it (a default install would not land in it).
  const latestOutsideVulnerable = range
    ? !semver.satisfies(latest, range, { includePrerelease: true })
    : true;

  const status = upstreamAheadOfPin && latestOutsideVulnerable ? 'review' : 'keep';
  return { name, status, pinnedVersion, latestVersion, range: range ?? null };
}

// Reduce a pnpm.overrides object to the versioned entries worth reporting on
// (skips nested `parent>child` shims, which have no standalone range/pin).
export function reportableOverrides(overrides) {
  return Object.entries(overrides ?? {})
    .map(([key, value]) => ({ key, value, ...parseOverrideKey(key) }))
    .filter(entry => !entry.nested);
}

async function fetchLatestVersion(name) {
  try {
    const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2F')}/latest`);
    if (!res.ok) return { latestVersion: null, error: `HTTP ${res.status}` };
    const body = await res.json();
    return { latestVersion: body.version ?? null, error: null };
  } catch (err) {
    return { latestVersion: null, error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const asJson = process.argv.includes('--json');
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const entries = reportableOverrides(pkg.pnpm?.overrides ?? {});

  const rows = [];
  for (const entry of entries) {
    const { latestVersion, error } = await fetchLatestVersion(entry.name);
    if (error) {
      rows.push({ name: entry.name, status: 'fetch-error', pinnedVersion: entry.value, error });
      continue;
    }
    rows.push(
      classifyOverride({
        name: entry.name,
        range: entry.range,
        pinnedVersion: entry.value,
        latestVersion,
      })
    );
  }

  if (asJson) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  const review = rows.filter(r => r.status === 'review');
  const errors = rows.filter(r => r.status === 'fetch-error');

  console.log('pnpm.overrides staleness report (ADS-1112) — informational, non-blocking\n');
  if (review.length === 0) {
    console.log('No override was flagged as a removal candidate.');
  } else {
    console.log('Candidates to re-evaluate (upstream latest is past the pinned/vulnerable range):');
    for (const r of review) {
      console.log(
        `  - ${r.name}: pinned '${r.pinnedVersion}', latest ${r.latestVersion}${r.range ? ` (guarded range: ${r.range})` : ''}`
      );
    }
    console.log(
      '\nBefore removing a pin, confirm every transitive consumer resolves a safe version'
    );
    console.log('(pnpm why <pkg>) and that the advisory the override cites is fully out of range.');
  }
  if (errors.length > 0) {
    console.log('\nCould not fetch (network) — re-run with connectivity:');
    for (const r of errors) console.log(`  - ${r.name}: ${r.error}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
