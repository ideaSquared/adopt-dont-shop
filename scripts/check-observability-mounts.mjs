#!/usr/bin/env node
/**
 * Observability container host-mount guard (ADS-1376).
 *
 * cAdvisor must never bind-mount `/var/run` (or any other host socket, e.g.
 * `docker.sock`/`podman.sock`, wherever it lives) directly: a unix socket
 * mounted `:ro` is still fully connectable, so a compromised cAdvisor
 * process would get full Docker API access — a host-root-equivalent escape
 * — despite this stack's otherwise-strict hardening. It still needs *some*
 * Docker API access (via the `docker-socket-proxy` service) to populate the
 * container-name label the ContainerRestarting alert filters on, so that
 * proxy's nginx config (observability/docker-socket-proxy/server.conf) must
 * stay an exact-path allow-list of the 5 endpoints cAdvisor actually needs —
 * never a URL-prefix one, which would also let through endpoints like
 * `/containers/{id}/archive` that can read arbitrary files, including
 * secrets, out of any other container.
 *
 * node-exporter and cAdvisor also bind-mount the full host rootfs
 * (`/:/host/root:ro`, `/:/rootfs:ro`) for disk-space/container metrics, which
 * exposes the plaintext production secrets deploy-secrets.sh materialises
 * under /opt/ads/<env>/secrets/. Both must shadow that path with a `tmpfs`
 * mounted `mode=000` — unreadable even to root, matching this stack's
 * `cap_drop: ALL` (no `CAP_DAC_OVERRIDE` to bypass the permission bits).
 *
 * Run via `node scripts/check-observability-mounts.mjs` or
 * `pnpm check:observability-mounts` (wired into `ci:local`).
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const COMPOSE_FILE = 'docker-compose.observability.yml';
export const PROXY_CONF_FILE = 'observability/docker-socket-proxy/server.conf';

// Matches on the mount SOURCE only (never the target or options) — a `/`
// or end-of-string boundary after `/var/run` so `/var/run/anything` is
// caught, not just `/var/run` exactly, and any source ending in `.sock`
// (podman, containerd, cri-dockerd, docker — any host-control socket, not
// just docker.sock specifically, and wherever it's bind-mounted from).
const UNSAFE_SOURCE_PATTERN = /^\/var\/run(\/|$)|\.sock$/i;

const SECRETS_MASKS = [
  { service: 'node-exporter', tmpfsPath: '/host/root/opt/ads' },
  { service: 'cadvisor', tmpfsPath: '/rootfs/opt/ads' },
];

// cAdvisor's only legitimate reasons to talk to the Docker API at all (see
// server.conf for the exact nginx `location` blocks these correspond to).
const PROXY_REQUIRED_ENDPOINTS = [
  { label: 'GET /containers/json (container list)', pattern: /\/containers\/json\$/ },
  {
    label: 'GET /containers/{id}/json (inspect -> name label)',
    pattern: /\/containers\/\[\^\/\]\+\/json\$/,
  },
  { label: 'GET /info (cAdvisor startup handshake)', pattern: /\/info\$/ },
  { label: 'GET /version (API version negotiation)', pattern: /\/version\$/ },
  { label: "GET /_ping (this proxy's own healthcheck)", pattern: /\/_ping\$/ },
];
// Anything beyond the 5 endpoints above — archive/export/logs/attach/exec
// (file or stream access to *any* container), and every other API section
// (images, volumes, networks, secrets, auth, swarm, …) — must never appear
// in this file. This is deliberately broader than "just block archive";
// a `location` block added for any of these would also need to be caught.
const PROXY_FORBIDDEN_KEYWORDS = [
  'archive',
  'export',
  'logs',
  'attach',
  'exec',
  'auth',
  'build',
  'commit',
  'configs',
  'distribution',
  'grpc',
  'images',
  'networks',
  'nodes',
  'plugins',
  'secrets',
  'services',
  'session',
  'swarm',
  'tasks',
  'volumes',
];

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

// Returns the direct child lines of a `key:` block (e.g. `tmpfs:`),
// stopping at the first line dedented back to (or past) the key's own
// indent. Works for both list (`- foo`) and mapping (`FOO: bar`) blocks.
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
    const sources = [];

    // Compose short syntax: `- /var/run:/var/run:ro` (source is the first
    // colon-delimited segment — paths never contain a literal `:` on
    // Linux, so splitting on it is safe).
    const shortMatch = line.match(/^\s*-\s*(\S+)\s*$/);
    if (shortMatch) sources.push(shortMatch[1].split(':')[0]);

    // Compose long syntax (`source: /var/run` on its own line) *and*
    // inline-mapping syntax (`- { type: bind, source: /var/run, target:
    // /var/run }`) — both contain the substring `source: <value>`
    // somewhere on the line, so one unanchored regex catches both.
    const sourceMatch = line.match(/\bsource:\s*([^\s,}'"]+)/);
    if (sourceMatch) sources.push(sourceMatch[1]);

    for (const source of sources) {
      if (UNSAFE_SOURCE_PATTERN.test(source)) {
        failures.push({ file, line: service.serviceIndex + offset + 1, mount: source });
      }
    }
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
    const hasMask = tmpfsLines.some(line => {
      const trimmed = line.trim();
      const prefix = `- ${tmpfsPath}:`;
      if (!trimmed.startsWith(prefix)) return false;
      const options = trimmed.slice(prefix.length).split(',');
      return options.includes('mode=000');
    });
    if (!hasMask) failures.push({ file, service, tmpfsPath });
  }
  return failures;
}

export function findUnsafeSocketProxyConfig(file = PROXY_CONF_FILE, root = ROOT) {
  let rawContent;
  try {
    rawContent = readFileSync(join(root, file), 'utf8');
  } catch {
    return []; // file absent — nothing to guard
  }

  // Strip comment lines before scanning — this file's own explanatory
  // comments necessarily name the dangerous endpoints/sections it exists
  // to keep out (see the header comment above), which would otherwise
  // false-positive the forbidden-keyword check below.
  const content = rawContent
    .split('\n')
    .filter(line => !line.trim().startsWith('#'))
    .join('\n');

  const failures = [];
  for (const { label, pattern } of PROXY_REQUIRED_ENDPOINTS) {
    if (!pattern.test(content)) {
      failures.push({ file, reason: `missing required endpoint: ${label}` });
    }
  }
  for (const word of PROXY_FORBIDDEN_KEYWORDS) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(content)) {
      failures.push({ file, reason: `must not reference "${word}"` });
    }
  }
  if (!/limit_except\s+GET/.test(content)) {
    failures.push({ file, reason: 'every location must restrict itself to GET with limit_except' });
  }
  if (!/location\s*\/\s*\{\s*return 403/.test(content)) {
    failures.push({
      file,
      reason: 'must deny by default for any unmatched path (`location / { return 403; }`)',
    });
  }
  return failures;
}

function main() {
  const unsafeMounts = findCadvisorUnsafeMounts(COMPOSE_FILE);
  const missingMasks = findMissingSecretsMasks(COMPOSE_FILE);
  const unsafeProxyConfig = findUnsafeSocketProxyConfig();

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
      'Front the socket with the docker-socket-proxy service instead, if container-name resolution is needed.'
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
      'production secrets under /opt/ads/<env>/secrets/. Shadow that path with a `mode=000` tmpfs mount.'
    );
    console.error('');
  }

  if (unsafeProxyConfig.length > 0) {
    console.error('docker-socket-proxy is misconfigured (ADS-1376):');
    for (const { file, reason } of unsafeProxyConfig) {
      console.error(`  - ${file}: ${reason}`);
    }
    console.error('');
    console.error(
      'This proxy is the only container with access to the real docker.sock; its nginx config must'
    );
    console.error(
      'stay an exact-path allow-list of the 5 endpoints cAdvisor needs, or it reintroduces the'
    );
    console.error('host-root-equivalent escape ADS-1376 removed from cAdvisor itself.');
  }

  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
