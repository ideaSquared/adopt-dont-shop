#!/usr/bin/env node
/**
 * CSP regression guard (ADS-847).
 *
 * Asserts that the nginx security-headers.conf baked into Dockerfile.app does
 * not contain `unsafe-inline` in style-src. The codebase migrated from
 * styled-components (which required unsafe-inline) to vanilla-extract; this
 * check prevents backsliding.
 *
 * Run via `node scripts/check-csp-headers.mjs` or wired into ci.yml.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const dockerfile = readFileSync(join(ROOT, 'Dockerfile.app'), 'utf8');

// Extract every Content-Security-Policy header value from the Dockerfile.
const cspPattern = /add_header Content-Security-Policy "([^"]+)"/g;
const policies = [];
let match;
while ((match = cspPattern.exec(dockerfile)) !== null) {
  policies.push(match[1]);
}

if (policies.length === 0) {
  console.error('ERROR: No Content-Security-Policy header found in Dockerfile.app');
  process.exit(1);
}

const failures = [];
for (const policy of policies) {
  // Check style-src specifically — unsafe-inline there lets CSS injection bypass CSP.
  const styleSrcMatch = policy.match(/style-src\s+([^;]+)/);
  if (!styleSrcMatch) continue;
  const styleSrc = styleSrcMatch[1];
  if (styleSrc.includes("'unsafe-inline'")) {
    failures.push(`style-src contains 'unsafe-inline': ${policy}`);
  }
}

if (failures.length > 0) {
  console.error('CSP regression detected in Dockerfile.app:');
  for (const f of failures) console.error(`  ${f}`);
  console.error(
    "\nThe codebase uses vanilla-extract for styling; 'unsafe-inline' in style-src is not needed.",
    '\nRemove it from the Content-Security-Policy in Dockerfile.app. [ADS-847]',
  );
  process.exit(1);
}

console.log(`✓ CSP style-src is clean (${policies.length} polic${policies.length === 1 ? 'y' : 'ies'} checked)`);
