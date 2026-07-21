#!/usr/bin/env node
/**
 * README template guard (ADS-946).
 *
 * Checks every apps, services, and packages workspace README.md against the
 * canonical section headings defined in docs/templates/README.{app,service,lib}.md
 * and reports which are missing.
 *
 * Mixed mode (per ADS-946): a workspace listed in STRICT_PACKAGES is a hard
 * failure (exit 1) if its README drifts from the template; every other
 * workspace is warn-only so existing packages that haven't been backfilled
 * yet don't block CI. Bring a README up to the template, then add its dir to
 * STRICT_PACKAGES to enforce it going forward. This guard runs in CI's
 * workspace-drift job, so a strict regression fails the build.
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

// Workspaces backfilled to the template and enforced as a hard failure if
// they regress. Enforcement is opt-in per package (see the module comment):
// this first strict set is the three React apps plus the previously
// undocumented shared packages. The remaining services + libs stay warn-only
// until their (substantial, hand-written) READMEs are restructured to the
// canonical headings in follow-ups.
const STRICT_PACKAGES = [
  'apps/admin',
  'apps/client',
  'apps/rescue',
  'packages/config-secrets',
  'packages/eslint-config-base',
  'packages/eslint-config-node',
  'packages/eslint-config-react',
  'packages/seed-faker',
  'packages/service-bootstrap',
  'packages/test-utils',
];

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
