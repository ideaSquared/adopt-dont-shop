#!/usr/bin/env node
/**
 * pnpm.overrides ↔ overridesDocumentation parity guard (ADS-1113).
 *
 * The `overridesDocumentation` block in package.json records the rationale for
 * each CVE-mitigation `pnpm.overrides` entry, but nothing kept the two in sync:
 * the `ws` override shipped undocumented and the `postcss` note drifted from the
 * pinned version. This guard fails when a CVE-style override key has no matching
 * `overridesDocumentation` entry, so a new pin can't merge undocumented.
 *
 * Structural/dedup overrides (single-copy pins and peer-compat shims that need
 * no CVE rationale, or are covered collectively by a sibling note) are exempt
 * via STRUCTURAL_OVERRIDE_BASES.
 *
 * Mirrors the pattern of the other scripts/check-*.mjs guards.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Override bases that need no standalone CVE rationale entry: React
// single-copy/dedup pins and peer-compat shims. `react`, `@types/react` and
// `eslint-plugin-react` DO carry their own documentation (explaining the dedup
// / peer rationale) and are validated like any other entry; the bases below
// have no standalone note and are pure structural dedup covered by those
// sibling entries.
export const STRUCTURAL_OVERRIDE_BASES = new Set([
  'react-dom',
  '@types/react-dom',
  '@types/express',
  '@types/express-serve-static-core',
  'react-zdog',
]);

// The pnpm nested-override separator is a `>` that begins a child package spec
// (followed by a name char: letter or `@`), NOT a `>`/`>=` version operator
// (followed by `=` or a digit). `svgo@>=3.0.0 <3.3.4` must not be mistaken for
// a nested selector.
const NESTED_SEPARATOR = />(?=[a-zA-Z@])/;

// Strip a trailing version selector (`pkg@<1.2.3`, `@scope/pkg@>=1 <2`) from a
// single package spec, leaving the bare (optionally scoped) package name.
function stripVersionSelector(spec) {
  const at = spec.lastIndexOf('@');
  return at > 0 ? spec.slice(0, at).trim() : spec.trim();
}

// Reduce a pnpm.overrides key to the package whose rationale must be
// documented. Nested selectors (`parent>child`) are documented under the
// parent; version-scoped selectors reduce to the bare package name.
export function overrideBaseName(key) {
  const gt = key.search(NESTED_SEPARATOR);
  const spec = gt === -1 ? key : key.slice(0, gt);
  return stripVersionSelector(spec);
}

// Every override base that lacks both a documentation entry and a structural
// exemption, de-duplicated (multiple version-range pins collapse to one base)
// and sorted for stable output.
export function findUndocumentedOverrides(
  overrides,
  documentation,
  exempt = STRUCTURAL_OVERRIDE_BASES
) {
  const documented = new Set(Object.keys(documentation ?? {}));
  const missing = new Set();
  for (const key of Object.keys(overrides ?? {})) {
    const base = overrideBaseName(key);
    if (documented.has(base) || exempt.has(base)) continue;
    missing.add(base);
  }
  return [...missing].sort();
}

// Documentation entries that match no override base — dead notes left behind
// after an override was removed. Surfaced as a warning, not a hard failure.
export function findOrphanedDocumentation(
  overrides,
  documentation,
  exempt = STRUCTURAL_OVERRIDE_BASES
) {
  const bases = new Set(Object.keys(overrides ?? {}).map(overrideBaseName));
  return Object.keys(documentation ?? {})
    .filter(key => !bases.has(key) && !exempt.has(key))
    .sort();
}

function main() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const overrides = pkg.pnpm?.overrides ?? {};
  const documentation = pkg.overridesDocumentation ?? {};

  const missing = findUndocumentedOverrides(overrides, documentation);
  const orphaned = findOrphanedDocumentation(overrides, documentation);

  if (orphaned.length > 0) {
    console.warn(
      `Warning: overridesDocumentation has entries with no matching pnpm.overrides: ${orphaned.join(', ')}`
    );
    console.warn('');
  }

  if (missing.length === 0) {
    console.log('OK — every pnpm.overrides entry has an overridesDocumentation note.');
    return;
  }

  console.error('overridesDocumentation parity check failed (ADS-1113):');
  for (const base of missing) {
    console.error(
      `  - pnpm.overrides pins '${base}' but overridesDocumentation has no entry for it.`
    );
  }
  console.error('');
  console.error(
    'Add a note to the "overridesDocumentation" block in package.json explaining why the'
  );
  console.error(
    'override exists (advisory / dedup rationale + the floor version), or add the package'
  );
  console.error(
    'to STRUCTURAL_OVERRIDE_BASES in scripts/check-overrides-documentation.mjs if it is a'
  );
  console.error('pure structural/dedup pin covered by a sibling note.');
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
