#!/usr/bin/env node
/**
 * README template guard (ADS-946).
 *
 * Checks every apps, services, and packages workspace README.md against the
 * canonical section headings defined in docs/templates/README.{app,service,lib}.md
 * and reports which are missing.
 *
 * Informational / warn-only: always exits 0. The intent (per ADS-946) is
 * to surface drift without blocking existing packages that haven't been
 * backfilled yet — flip a package to strict enforcement by adding it to
 * STRICT_PACKAGES below once its README has been brought up to the template.
 *
 * Mirrors the no-dependency single-file style of scripts/check-*.mjs.
 */
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Shared sections every README family needs, plus one family-specific
// section that differs by what the package actually exposes.
const SHARED_HEADINGS = [
  '## Purpose',
  '## Location in the architecture',
  '## Scripts',
  '## Environment variables consumed',
  '## Testing notes',
  '## Ownership',
];

const FAMILY_HEADINGS = {
  apps: [...SHARED_HEADINGS, '## Public surface'],
  services: [...SHARED_HEADINGS, '## REST / gRPC contract'],
  packages: [...SHARED_HEADINGS, '## Public API / exports'],
};

// Packages that have been backfilled to the template and should be treated
// as a hard failure (not just a warning) if they regress. Empty today —
// ADS-946 ships the template + guard; enforcement is opt-in per package.
const STRICT_PACKAGES = [];

function listPackageDirs(family) {
  const familyDir = join(ROOT, family);
  let entries;
  try {
    entries = readdirSync(familyDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter(e => e.isDirectory())
    .map(e => join(familyDir, e.name))
    .filter(dir => existsSync(join(dir, 'package.json')));
}

function checkReadme(dir, requiredHeadings) {
  const readmePath = join(dir, 'README.md');
  if (!existsSync(readmePath)) {
    return { missing: ['README.md does not exist'] };
  }
  const contents = readFileSync(readmePath, 'utf8');
  const missing = requiredHeadings.filter(h => !contents.includes(h));
  return { missing };
}

function main() {
  const families = ['apps', 'services', 'packages'];
  let warnCount = 0;
  let failCount = 0;

  for (const family of families) {
    const headings = FAMILY_HEADINGS[family];
    for (const dir of listPackageDirs(family)) {
      const relDir = relative(ROOT, dir);
      const { missing } = checkReadme(dir, headings);
      if (missing.length === 0) continue;

      const isStrict = STRICT_PACKAGES.includes(relDir);
      const label = isStrict ? 'FAIL' : 'warn';
      console.log(`${label}  ${relDir}/README.md missing: ${missing.join(', ')}`);
      if (isStrict) failCount++;
      else warnCount++;
    }
  }

  console.log('');
  console.log(
    `check-readmes: ${warnCount} warning(s), ${failCount} strict failure(s). ` +
      `Template: docs/templates/README.{app,service,lib}.md`
  );

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
