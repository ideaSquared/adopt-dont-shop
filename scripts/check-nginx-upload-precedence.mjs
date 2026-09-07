#!/usr/bin/env node
/**
 * nginx upload-location precedence guard (ADS-1294).
 *
 * nginx evaluates the longest-matching PREFIX location, then — unless that
 * prefix is marked `^~` — also checks server-level REGEX locations, and a
 * matching regex wins over a plain prefix. `nginx/nginx.prod.conf` proxies
 * static-asset extensions (.js/.css/.png/.jpg/...) to the client SPA via a
 * server-level regex location. Without `^~` on the `/uploads/documents/` and
 * `/uploads/` prefix locations, that regex would win over both: a `deny all`
 * on `/uploads/documents/` (which holds PII — ID/proof-of-address scans)
 * would never fire for any extension the regex matches, and public
 * `/uploads/` files would be misrouted to the SPA upstream instead of served
 * from the mounted volume.
 *
 * This guard asserts both prefix locations keep `^~` so a future edit can't
 * silently reintroduce the regex override.
 *
 * Run via `node scripts/check-nginx-upload-precedence.mjs` or
 * `pnpm check:nginx-upload-precedence` (wired into `ci:local`).
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONF_PATH = 'nginx/nginx.prod.conf';

// The upload prefix locations that must win over the server-level
// static-asset regex location. Exported so the test can assert this list
// stays in sync with the config.
export const REQUIRED_PREFIXES = ['/uploads/documents/', '/uploads/'];

export function findMissingCaretTilde(text, prefixes = REQUIRED_PREFIXES) {
  return prefixes.filter(prefix => {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const caretTildePattern = new RegExp(`location\\s+\\^~\\s+${escaped}\\s*\\{`);
    return !caretTildePattern.test(text);
  });
}

function main() {
  const text = readFileSync(join(ROOT, CONF_PATH), 'utf8');
  const missing = findMissingCaretTilde(text);

  if (missing.length === 0) {
    console.log(
      `OK — ${CONF_PATH}: all ${REQUIRED_PREFIXES.length} upload prefix location(s) use ^~.`
    );
    return;
  }

  console.error(`${CONF_PATH}: upload prefix location(s) missing ^~:`);
  for (const prefix of missing) {
    console.error(`  - location ${prefix} { ... } must be "location ^~ ${prefix} { ... }"`);
  }
  console.error('');
  console.error(
    'Without ^~, the server-level static-asset regex location can win over these prefixes ' +
      'and bypass the /uploads/documents/ deny (ADS-1294).'
  );
  process.exit(1);
}

// Only run when executed directly (`node scripts/check-nginx-upload-precedence.mjs`),
// not when imported by the test file.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
