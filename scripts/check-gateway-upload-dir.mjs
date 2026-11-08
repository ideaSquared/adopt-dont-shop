#!/usr/bin/env node
/**
 * Gateway UPLOAD_DIR guard.
 *
 * Dockerfile.service sets WORKDIR to the service dir (/app/services/gateway),
 * so the gateway's relative default UPLOAD_DIR ('uploads') resolves onto the
 * read-only rootfs (EROFS). In prod/staging the writable `uploads` named
 * volume is mounted into service-gateway, and UPLOAD_DIR must point at that
 * mount path or every upload fails.
 *
 * Text/regex scan (like check-stop-grace-period.mjs): finds the
 * `service-gateway` block, reads the container path of its `uploads:<path>`
 * volume mount and its `UPLOAD_DIR:` value, and requires them to match.
 *
 * Run via `node scripts/check-gateway-upload-dir.mjs` or
 * `pnpm check:gateway-upload-dir` (wired into `ci:local`).
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const COMPOSE_FILES = ['docker-compose.prod.yml', 'docker-compose.staging.yml'];

const GATEWAY_KEY_RE = /^ {2}service-gateway:\s*$/;
const NEXT_KEY_RE = /^ {0,2}\S/;
const MOUNT_RE = /^\s*-\s*uploads:([^:\s]+)/;
const UPLOAD_DIR_RE = /^\s*UPLOAD_DIR:\s*["']?([^"'\s#]+)/;

/**
 * Returns `{ file, mount, uploadDir }` when service-gateway mounts the
 * `uploads` volume but UPLOAD_DIR is not that mount path; undefined otherwise.
 */
export function findUploadDirMismatch(file, root = ROOT) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  const start = lines.findIndex(l => GATEWAY_KEY_RE.test(l));
  if (start === -1) return undefined;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(l => NEXT_KEY_RE.test(l));
  const block = end === -1 ? rest : rest.slice(0, end);

  const mount = block.map(l => l.match(MOUNT_RE)).find(Boolean)?.[1];
  if (!mount) return undefined;
  const uploadDir = block.map(l => l.match(UPLOAD_DIR_RE)).find(Boolean)?.[1];
  return uploadDir === mount ? undefined : { file, mount, uploadDir };
}

function main() {
  const failures = COMPOSE_FILES.map(f => findUploadDirMismatch(f)).filter(Boolean);

  if (failures.length === 0) {
    console.log('OK — service-gateway UPLOAD_DIR matches its uploads volume mount.');
    return;
  }

  console.error('service-gateway UPLOAD_DIR does not match the uploads volume mount:');
  for (const { file, mount, uploadDir } of failures) {
    console.error(
      `  - ${file}: uploads mounted at ${mount}, UPLOAD_DIR is ${uploadDir ?? '(unset)'}`
    );
  }
  console.error('');
  console.error(
    'Set UPLOAD_DIR in the service-gateway environment to the mount path — the gateway WORKDIR ' +
      'is /app/services/gateway, so the relative default writes to the read-only rootfs.'
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
