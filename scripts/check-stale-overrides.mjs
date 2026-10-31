#!/usr/bin/env node
/**
 * Stale pnpm.overrides gate (ADS-1112).
 *
 * A security override forces a transitive package onto a patched version. It
 * only does work while some package in the tree declares a range that would
 * still resolve to a vulnerable version. Once every consumer's own range
 * reaches a patched release, a lockfile refresh fixes the advisory on its own
 * and the override is dead weight — and dead weight piles up: by October 2026
 * the block held 33 security pins and 30 of them no longer did anything.
 *
 * For each security override this script:
 *   1. finds every consumer in pnpm-lock.yaml (workspace importers and
 *      third-party packages that depend on the overridden package),
 *   2. reads the range each consumer declares (importer specifiers from the
 *      lockfile; package manifests from the npm registry),
 *   3. works out what pnpm would resolve for that range without the override
 *      (dist-tags.latest if it satisfies, else the highest match), and
 *   4. fails if no consumer would land on a vulnerable version.
 *
 * Fails closed: a registry error exits non-zero rather than passing unverified.
 * The decision logic is pure and unit-tested; only fetchPackument touches the
 * network.
 *
 *   node scripts/check-stale-overrides.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import semver from 'semver';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = 'https://registry.npmjs.org';
const MAX_RETRIES = 3;
const FETCH_CONCURRENCY = 10;

// Overrides that exist for deduplication or peer compatibility, not to force a
// patched version. They are expected to match what consumers already resolve,
// so the staleness test does not apply. Nested `parent>child` selectors are
// skipped too (see parseOverrideKey). Every other override is a security floor.
export const NON_SECURITY_OVERRIDE_BASES = new Set([
  'react',
  'react-dom',
  '@types/react',
  '@types/react-dom',
  '@types/express',
  '@types/express-serve-static-core',
]);

// The pnpm nested-override separator is a `>` that begins a child package spec
// (followed by a name char), NOT a `>`/`>=` version operator (followed by `=`
// or a digit) — so `svgo@>=3.0.0 <3.3.4` is a versioned key, not a nested one.
const NESTED_SEPARATOR = />(?=[a-zA-Z@])/;

// Split a pnpm.overrides key into { name, range, nested }. `range` is the
// version selector the override matches against (the vulnerable range for a
// security pin), or null for a bare key.
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

// The overrides this gate judges: not nested, not a dedup/compat pin.
export function securityOverrides(overrides, exempt = NON_SECURITY_OVERRIDE_BASES) {
  return Object.entries(overrides ?? {})
    .map(([key, value]) => ({ key, value, ...parseOverrideKey(key) }))
    .filter(entry => !entry.nested && !exempt.has(entry.name));
}

// A version the override exists to keep out of the tree. A versioned key
// (`pkg@<1.2.3`) names the vulnerable range directly; a bare key (`pkg: ^1.2.3`)
// treats anything outside its value as unsafe.
export function isUnsafeVersion(version, { range, value }) {
  return range
    ? semver.satisfies(version, range, { includePrerelease: true })
    : !semver.satisfies(version, value, { includePrerelease: true });
}

const unquote = text => text.trim().replace(/^'(.*)'$/, '$1');
const indentOf = line => line.length - line.trimStart().length;

// `'@scope/name@1.2.3(peer@4.5.6)'` → { name: '@scope/name', version: '1.2.3' }
function parseSnapshotKey(rawKey) {
  const key = unquote(rawKey).replace(/\(.*$/, '');
  const at = key.lastIndexOf('@');
  return { name: key.slice(0, at), version: key.slice(at + 1) };
}

const DEPENDENCY_FIELDS = new Set(['dependencies', 'devDependencies', 'optionalDependencies']);

// Every consumer pnpm-lock.yaml (v9) records, as
//   importers: [{ importer, name, specifier }]   workspace package.json ranges
//   packages:  [{ parent, parentVersion, name }] third-party dependents
// Line-based so the gate needs no YAML dependency; the lockfile layout is fixed.
export function lockfileConsumers(lockfileText) {
  const importers = [];
  const packages = [];
  let section = null;
  let owner = null;
  let field = null;
  let dep = null;

  for (const line of lockfileText.split('\n')) {
    if (line.trim() === '') continue;
    const indent = indentOf(line);
    const text = line.trim();

    if (indent === 0) {
      section = text.replace(/:.*$/, '');
      continue;
    }
    if (indent === 2) {
      owner = unquote(text.replace(/:( \{\})?$/, ''));
      field = null;
      continue;
    }
    if (indent === 4) {
      field = text.replace(/:$/, '');
      continue;
    }
    if (!DEPENDENCY_FIELDS.has(field)) continue;

    if (section === 'importers') {
      if (indent === 6) dep = unquote(text.replace(/:$/, ''));
      const specifier = indent === 8 && text.match(/^specifier: (.+)$/);
      if (specifier)
        importers.push({ importer: owner, name: dep, specifier: unquote(specifier[1]) });
      continue;
    }
    if (section === 'snapshots' && indent === 6) {
      const sep = text.indexOf(': ');
      const { name: parent, version: parentVersion } = parseSnapshotKey(owner);
      packages.push({ parent, parentVersion, name: unquote(text.slice(0, sep)) });
    }
  }
  return { importers, packages };
}

// A consumer can declare the package through an alias of itself
// (`npm:esbuild@>=0.17.6 <0.29.0`); that is still a plain range for it.
const selfAliasRange = (name, range) =>
  range.startsWith(`npm:${name}@`) ? range.slice(`npm:${name}@`.length) : range;

// What pnpm resolves for `range` with no override: dist-tags.latest when it
// satisfies the range, otherwise the highest satisfying version. null when the
// range is not a plain semver range (alias of another package, git URL, …).
export function wouldResolve(packument, range) {
  if (!packument || semver.validRange(range) === null) return null;
  const latest = packument['dist-tags']?.latest;
  if (latest && semver.satisfies(latest, range)) return latest;
  return semver.maxSatisfying(Object.keys(packument.versions ?? {}), range);
}

// The range a manifest declares for `name`, or null if it declares none.
const declaredRange = (manifest, name) =>
  manifest?.dependencies?.[name] ??
  manifest?.devDependencies?.[name] ??
  manifest?.optionalDependencies?.[name] ??
  manifest?.peerDependencies?.[name] ??
  null;

// Every package name whose registry metadata the decision needs.
export function packumentsNeeded(entries, consumers) {
  const names = new Set(entries.map(entry => entry.name));
  const parents = consumers.packages
    .filter(consumer => names.has(consumer.name))
    .map(consumer => consumer.parent);
  return [...new Set([...names, ...parents])].sort();
}

// Judge each security override. `stale: true` means no consumer would resolve
// a vulnerable version without it. `blockers` lists the consumers that still
// need it (a range resolving to an unsafe version, or one we cannot evaluate,
// which conservatively counts as needing the override).
//
// `workspaceManifests` maps an importer path to its package.json. pnpm writes
// the override's target into the lockfile's importer `specifier`, so a
// workspace package's real range must come from its manifest; the lockfile
// specifier is only a fallback when no manifest is supplied.
export function judgeOverrides(entries, consumers, packuments, workspaceManifests = new Map()) {
  return entries.map(entry => {
    const fromImporters = consumers.importers
      .filter(consumer => consumer.name === entry.name)
      .map(consumer => ({
        consumer: consumer.importer,
        range:
          declaredRange(workspaceManifests.get(consumer.importer), entry.name) ??
          consumer.specifier,
      }));
    const fromPackages = consumers.packages
      .filter(consumer => consumer.name === entry.name)
      .map(consumer => ({
        consumer: `${consumer.parent}@${consumer.parentVersion}`,
        range: declaredRange(
          packuments.get(consumer.parent)?.versions?.[consumer.parentVersion],
          entry.name
        ),
      }));
    const ranges = [...fromImporters, ...fromPackages];

    if (ranges.length === 0) {
      return { key: entry.key, stale: true, reason: 'nothing in pnpm-lock.yaml depends on it' };
    }

    const blockers = ranges
      .map(({ consumer, range }) => ({
        consumer,
        range,
        resolves:
          range === null
            ? null
            : wouldResolve(packuments.get(entry.name), selfAliasRange(entry.name, range)),
      }))
      .filter(({ resolves }) => resolves === null || isUnsafeVersion(resolves, entry));

    return blockers.length === 0
      ? {
          key: entry.key,
          stale: true,
          reason: `every consumer's own range resolves to a safe version (${ranges.length} checked)`,
        }
      : { key: entry.key, stale: false, blockers };
  });
}

async function fetchPackument(name) {
  const url = `${REGISTRY}/${name.replace('/', '%2F')}`;
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/vnd.npm.install-v1+json' } });
      if (res.ok) return await res.json();
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`${name}: ${lastError}`);
}

async function fetchAll(names) {
  const batches = Array.from({ length: Math.ceil(names.length / FETCH_CONCURRENCY) }, (_, i) =>
    names.slice(i * FETCH_CONCURRENCY, (i + 1) * FETCH_CONCURRENCY)
  );
  const fetched = [];
  for (const batch of batches) {
    fetched.push(
      ...(await Promise.all(batch.map(async name => [name, await fetchPackument(name)])))
    );
  }
  return new Map(fetched);
}

async function main() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const entries = securityOverrides(pkg.pnpm?.overrides);

  if (entries.length === 0) {
    console.log('OK — pnpm.overrides holds no security overrides to check.');
    return;
  }

  const consumers = lockfileConsumers(readFileSync(join(ROOT, 'pnpm-lock.yaml'), 'utf8'));
  let packuments;
  try {
    packuments = await fetchAll(packumentsNeeded(entries, consumers));
  } catch (err) {
    console.error(
      `Could not read npm registry metadata, so the overrides are unverified: ${err.message}`
    );
    process.exit(1);
  }

  const workspaceManifests = new Map(
    [...new Set(consumers.importers.map(consumer => consumer.importer))].map(importer => [
      importer,
      JSON.parse(readFileSync(join(ROOT, importer, 'package.json'), 'utf8')),
    ])
  );
  const results = judgeOverrides(entries, consumers, packuments, workspaceManifests);
  const stale = results.filter(result => result.stale);

  for (const result of results.filter(r => !r.stale)) {
    const first = result.blockers[0];
    console.log(
      `keep  ${result.key} — ${first.consumer} declares '${first.range}' → ${first.resolves ?? 'unresolvable'}` +
        (result.blockers.length > 1 ? ` (+${result.blockers.length - 1} more)` : '')
    );
  }

  if (stale.length === 0) {
    console.log(`\nOK — all ${results.length} security override(s) are still needed.`);
    return;
  }

  console.error('\nStale pnpm.overrides (ADS-1112) — these no longer change what gets installed:');
  for (const result of stale) console.error(`  - ${result.key}: ${result.reason}`);
  console.error('');
  console.error('Remove each from pnpm.overrides and its overridesDocumentation note, run');
  console.error('`pnpm install`, and confirm `node scripts/audit-bulk.mjs` still passes.');
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
