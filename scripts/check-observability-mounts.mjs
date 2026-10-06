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
 * Run via `node scripts/check-observability-mounts.mjs` or
 * `pnpm check:observability-mounts` (wired into `ci:local`).
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const COMPOSE_FILE = 'docker-compose.observability.yml';

const UNSAFE_MOUNT_PATTERN = /\/var\/run(?::|$)|docker\.sock/;

export function findCadvisorUnsafeMounts(file, root = ROOT) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  const serviceIndex = lines.findIndex(line => line.trim() === 'cadvisor:');
  if (serviceIndex === -1) return [];

  const nextServiceIndex = lines.findIndex(
    (line, index) => index > serviceIndex && /^\s{2}\S.*:\s*$/.test(line)
  );
  const serviceLines = lines.slice(
    serviceIndex,
    nextServiceIndex === -1 ? lines.length : nextServiceIndex
  );

  const failures = [];
  serviceLines.forEach((line, offset) => {
    const match = line.match(/^\s*-\s*(\S+)\s*$/);
    if (!match) return;
    if (!UNSAFE_MOUNT_PATTERN.test(match[1])) return;
    failures.push({ file, line: serviceIndex + offset + 1, mount: match[1] });
  });
  return failures;
}

function main() {
  const failures = findCadvisorUnsafeMounts(COMPOSE_FILE);

  if (failures.length === 0) {
    console.log('OK — cAdvisor has no /var/run or docker.sock bind-mount.');
    return;
  }

  console.error('cAdvisor has an unsafe host-socket mount (ADS-1376):');
  for (const { file, line, mount } of failures) {
    console.error(`  - ${file}:${line} — ${mount}`);
  }
  console.error('');
  console.error(
    'A unix socket mounted :ro is still fully connectable; this grants full Docker API access.'
  );
  console.error(
    'Front the socket with a least-privilege docker-socket-proxy instead, if container-name resolution is needed.'
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
