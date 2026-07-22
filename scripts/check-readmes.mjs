#!/usr/bin/env node
/**
 * README template guard (ADS-946).
 *
 * Checks every apps, services, and packages workspace README.md against the
 * canonical section headings defined in docs/templates/README.{app,service,lib}.md
 * and reports which are missing.
 *
 * Fail-on-drift (ADS-946 complete): every apps/services/packages workspace is
 * enforced — a README that drifts from the template is a hard failure (exit 1).
 * The backfill is done, so there is no warn tier by default. A workspace can be
 * temporarily downgraded to a warning by listing it in WARN_ONLY_PACKAGES
 * (e.g. a brand-new package mid-backfill); that list is empty today. This guard
 * runs in CI's workspace-drift job, so any drift fails the build.
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

// Workspaces temporarily exempted from the hard-fail — drift here prints a
// warning instead of failing the build. Use only for a package mid-backfill;
// empty now that every workspace matches the template (ADS-946).
const WARN_ONLY_PACKAGES = [];

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

      const isStrict = !WARN_ONLY_PACKAGES.includes(relDir);
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
