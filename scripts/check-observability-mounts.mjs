#!/usr/bin/env node
/**
 * Observability container host-mount guard (ADS-1376).
 *
 * cAdvisor must never bind-mount `/var/run` (or `docker.sock` directly): a
 * unix socket mounted `:ro` is still fully connectable, so a compromised
 * cAdvisor process would get full Docker API access — a host-root-equivalent
 * escape — despite this stack's otherwise-strict hardening. cAdvisor doesn't
 * need the Docker API for its cgroup/sysfs/var-lib-docker-derived metrics.
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

export function findCadvisorUnsafeMounts(file, root = ROOT) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  const service = getServiceLines(lines, 'cadvisor');
  if (!service) return [];

  const failures = [];
  service.serviceLines.forEach((line, offset) => {
    const match = line.match(/^\s*-\s*(\S+)\s*$/);
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

    const hasMask = found.serviceLines.some(line => line.trim().startsWith(`- ${tmpfsPath}:`));
    if (!hasMask) failures.push({ file, service, tmpfsPath });
  }
  return failures;
}

function main() {
  const unsafeMounts = findCadvisorUnsafeMounts(COMPOSE_FILE);
  const missingMasks = findMissingSecretsMasks(COMPOSE_FILE);

  if (unsafeMounts.length === 0 && missingMasks.length === 0) {
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
  }

  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
