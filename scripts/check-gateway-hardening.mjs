#!/usr/bin/env node
/**
 * Edge gateway container hardening guard.
 *
 * deploy/gateway/docker-compose.gateway.yml holds the only containers exposed
 * to the internet. This text scan (like check-gateway-upload-dir.mjs) requires:
 *   - nginx: `read_only: true` with tmpfs for /var/cache/nginx and /var/run.
 *     /var/log/nginx must NOT be a tmpfs: the stock image symlinks its log
 *     files to /dev/stdout, and a tmpfs would hide them and keep logs off the
 *     Docker log driver.
 *   - certbot: `cap_drop: ALL` and `no-new-privileges:true`.
 *
 * Run via `node scripts/check-gateway-hardening.mjs` or
 * `pnpm check:gateway-hardening` (wired into `ci:local`).
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const COMPOSE_FILE = 'deploy/gateway/docker-compose.gateway.yml';

const NEXT_KEY_RE = /^ {0,2}\S/;

const serviceBlock = (lines, name) => {
  const start = lines.findIndex(l => l === `  ${name}:`);
  if (start === -1) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(l => NEXT_KEY_RE.test(l));
  return end === -1 ? rest : rest.slice(0, end);
};

const listItems = (block, key) => {
  const start = block.findIndex(l => l === `    ${key}:`);
  if (start === -1) return [];
  const rest = block.slice(start + 1);
  const end = rest.findIndex(l => /^ {4}\S/.test(l));
  const items = end === -1 ? rest : rest.slice(0, end);
  return items.map(l => l.match(/^\s*-\s*['"]?([^'"\s#]+)/)?.[1]).filter(Boolean);
};

const tmpfsPath = entry => entry.split(':')[0].replace(/(.)\/+$/, '$1');

const NGINX_LOG_DIR = '/var/log/nginx';

// A tmpfs on the log dir or any parent hides the image's stdout log symlinks.
const hidesNginxLogs = path => path === '/' || `${NGINX_LOG_DIR}/`.startsWith(`${path}/`);

/** Returns a list of human-readable violations; empty when hardened. */
export function findHardeningGaps(file = COMPOSE_FILE, root = ROOT) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  const nginx = serviceBlock(lines, 'nginx');
  const certbot = serviceBlock(lines, 'certbot');
  const tmpfs = listItems(nginx, 'tmpfs').map(tmpfsPath);

  return [
    nginx.includes('    read_only: true') ? undefined : 'nginx: read_only: true is missing',
    ...['/var/cache/nginx', '/var/run'].map(p =>
      tmpfs.includes(p) ? undefined : `nginx: tmpfs ${p} is missing`
    ),
    tmpfs.some(hidesNginxLogs)
      ? 'nginx: /var/log/nginx must not be a tmpfs (hides the stdout log symlinks)'
      : undefined,
    listItems(certbot, 'cap_drop').includes('ALL') ? undefined : 'certbot: cap_drop ALL is missing',
    listItems(certbot, 'security_opt').includes('no-new-privileges:true')
      ? undefined
      : 'certbot: no-new-privileges:true is missing',
  ].filter(Boolean);
}

function main() {
  const gaps = findHardeningGaps();
  if (gaps.length === 0) {
    console.log('OK — edge gateway containers are hardened.');
    return;
  }
  console.error(`${COMPOSE_FILE} is under-hardened:`);
  gaps.forEach(g => console.error(`  - ${g}`));
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
