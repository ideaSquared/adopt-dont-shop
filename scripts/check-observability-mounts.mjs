#!/usr/bin/env node
/**
 * Observability container host-mount guard (ADS-1376).
 *
 * cAdvisor must never bind-mount `/var/run` (or `docker.sock`) directly: a
 * unix socket mounted `:ro` is still fully connectable, so a compromised
 * cAdvisor process would get full Docker API access — a host-root-equivalent
 * escape — despite this stack's otherwise-strict hardening. It still needs
 * *some* Docker API access (via the `docker-socket-proxy` service) to
 * populate the container-name label the ContainerRestarting alert filters
 * on, so that proxy must stay scoped to read-only `/containers` + `/info`
 * access — never POST, AUTH or SECRETS.
 *
 * node-exporter and cAdvisor also bind-mount the full host rootfs
 * (`/:/host/root:ro`, `/:/rootfs:ro`) for disk-space/container metrics, which
 * exposes the plaintext production secrets deploy-secrets.sh materialises
 * under /opt/ads/<env>/secrets/. Both must shadow that path with an
 * unreadable tmpfs mount.
 *
 * Run via `node scripts/check-observability-mounts.mjs` or
 * `pnpm check:observability-mounts` (wired into `ci:local`).
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const COMPOSE_FILE = 'docker-compose.observability.yml';

const UNSAFE_MOUNT_PATTERN = /\/var\/run(?::|$)|docker\.sock/;

const SECRETS_MASKS = [
  { service: 'node-exporter', tmpfsPath: '/host/root/opt/ads' },
  { service: 'cadvisor', tmpfsPath: '/rootfs/opt/ads' },
];

const SOCKET_PROXY_SERVICE = 'docker-socket-proxy';
// cAdvisor only needs GET /containers/* (for the name label) and GET /info
// (required for cAdvisor's own startup handshake). Everything else —
// especially POST (write access to the whole API), AUTH and SECRETS — must
// stay off, or this proxy reintroduces the host-root-equivalent escape
// ADS-1376 removed from cAdvisor itself.
const SOCKET_PROXY_REQUIRED_ENV = ['CONTAINERS', 'INFO'];
const SOCKET_PROXY_FORBIDDEN_ENV = ['POST', 'AUTH', 'SECRETS'];

function leadingSpaces(line) {
  return line.match(/^(\s*)/)[1].length;
}

function getServiceLines(lines, service) {
  const serviceIndex = lines.findIndex(line => line.trim() === `${service}:`);
  if (serviceIndex === -1) return null;

  const nextServiceIndex = lines.findIndex(
    (line, index) => index > serviceIndex && /^\s{2}\S.*:\s*$/.test(line)
  );
  return {
    serviceIndex,
    serviceLines: lines.slice(
      serviceIndex,
      nextServiceIndex === -1 ? lines.length : nextServiceIndex
    ),
  };
}

// Returns the direct child lines of a `key:` block (e.g. `tmpfs:` or
// `environment:`), stopping at the first line dedented back to (or past)
// the key's own indent. Works for both list (`- foo`) and mapping
// (`FOO: bar`) blocks.
function getKeyBlockLines(lines, key) {
  const keyIndex = lines.findIndex(line => line.trim() === `${key}:`);
  if (keyIndex === -1) return [];

  const keyIndent = leadingSpaces(lines[keyIndex]);
  const blockLines = [];
  for (let i = keyIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    if (leadingSpaces(line) <= keyIndent) break;
    blockLines.push(line);
  }
  return blockLines;
}

export function findCadvisorUnsafeMounts(file, root = ROOT) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  const service = getServiceLines(lines, 'cadvisor');
  if (!service) return [];

  const failures = [];
  service.serviceLines.forEach((line, offset) => {
    // Compose short syntax: `- /var/run:/var/run:ro`.
    const shortMatch = line.match(/^\s*-\s*(\S+)\s*$/);
    // Compose long syntax: `- type: bind` / `  source: /var/run`.
    const longMatch = line.match(/^\s*source:\s*(\S+)\s*$/);
    const match = shortMatch ?? longMatch;
    if (!match) return;
    if (!UNSAFE_MOUNT_PATTERN.test(match[1])) return;
    failures.push({ file, line: service.serviceIndex + offset + 1, mount: match[1] });
  });
  return failures;
}

export function findMissingSecretsMasks(file, root = ROOT) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');

  const failures = [];
  for (const { service, tmpfsPath } of SECRETS_MASKS) {
    const found = getServiceLines(lines, service);
    if (!found) continue; // service absent from this file — nothing to guard

    const tmpfsLines = getKeyBlockLines(found.serviceLines, 'tmpfs');
    const hasMask = tmpfsLines.some(line => line.trim().startsWith(`- ${tmpfsPath}:`));
    if (!hasMask) failures.push({ file, service, tmpfsPath });
  }
  return failures;
}

export function findUnsafeSocketProxyConfig(file, root = ROOT) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  const service = getServiceLines(lines, SOCKET_PROXY_SERVICE);
  if (!service) return []; // service absent from this file — nothing to guard

  const env = {};
  for (const line of getKeyBlockLines(service.serviceLines, 'environment')) {
    const match = line.match(/^\s*(\w+):\s*['"]?(\S+?)['"]?\s*$/);
    if (match) env[match[1]] = match[2];
  }

  const failures = [];
  for (const key of SOCKET_PROXY_REQUIRED_ENV) {
    if (env[key] !== '1') {
      failures.push({ file, service: SOCKET_PROXY_SERVICE, reason: `${key} must be set to 1` });
    }
  }
  for (const key of SOCKET_PROXY_FORBIDDEN_ENV) {
    if (env[key] === '1') {
      failures.push({ file, service: SOCKET_PROXY_SERVICE, reason: `${key} must not be set to 1` });
    }
  }
  return failures;
}

function main() {
  const unsafeMounts = findCadvisorUnsafeMounts(COMPOSE_FILE);
  const missingMasks = findMissingSecretsMasks(COMPOSE_FILE);
  const unsafeProxyConfig = findUnsafeSocketProxyConfig(COMPOSE_FILE);

  if (unsafeMounts.length === 0 && missingMasks.length === 0 && unsafeProxyConfig.length === 0) {
    console.log('OK — observability host mounts are hardened (ADS-1376).');
    return;
  }

  if (unsafeMounts.length > 0) {
    console.error('cAdvisor has an unsafe host-socket mount (ADS-1376):');
    for (const { file, line, mount } of unsafeMounts) {
      console.error(`  - ${file}:${line} — ${mount}`);
    }
    console.error('');
    console.error(
      'A unix socket mounted :ro is still fully connectable; this grants full Docker API access.'
    );
    console.error(
      'Front the socket with a least-privilege docker-socket-proxy instead, if container-name resolution is needed.'
    );
    console.error('');
  }

  if (missingMasks.length > 0) {
    console.error(
      'An observability exporter is missing its production-secrets mount mask (ADS-1376):'
    );
    for (const { service, tmpfsPath } of missingMasks) {
      console.error(`  - ${service} has no \`tmpfs: - ${tmpfsPath}:...,mode=000\` entry`);
    }
    console.error('');
    console.error(
      'Both exporters bind-mount the full host rootfs for metrics, which also exposes the plaintext'
    );
    console.error(
      'production secrets under /opt/ads/<env>/secrets/. Shadow that path with an unreadable tmpfs mount.'
    );
    console.error('');
  }

  if (unsafeProxyConfig.length > 0) {
    console.error('docker-socket-proxy is misconfigured (ADS-1376):');
    for (const { service, reason } of unsafeProxyConfig) {
      console.error(`  - ${service}: ${reason}`);
    }
    console.error('');
    console.error(
      'This proxy is the only container with access to the real docker.sock; it must stay scoped to'
    );
    console.error(
      'read-only /containers + /info access (cAdvisor needs no more), or it reintroduces the'
    );
    console.error('host-root-equivalent escape ADS-1376 removed from cAdvisor itself.');
  }

  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
