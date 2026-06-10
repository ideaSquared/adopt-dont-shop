// Shared boot-time secret loader. Each extracted microservice calls
// readSecret/requireSecret instead of touching process.env directly for any
// credential, so an operator can supply the value either as a plaintext env
// var (NAME=…, dev / escape hatch) or as a file-mounted Docker secret
// (NAME_FILE=/run/secrets/name). The file path wins when present.
//
// This mirrors the readSecretOrEnv() helper the deleted service.backend
// monolith used so the same secret-file layout (terraform / deploy workflow
// drops files under /run/secrets/) keeps working post-extraction.
//
// Sync on purpose — secrets are read at boot, before the event loop starts
// doing real work. Failures should crash the process loud and fast.

import { readFileSync } from 'node:fs';

/**
 * Resolve a secret value from either a file-mounted Docker secret or a
 * plain env var.
 *
 * Precedence:
 *   1. `${name}_FILE` set     → read that path, return trimmed contents.
 *   2. `${name}` set          → return the env value as-is.
 *   3. neither set            → return `undefined`.
 *
 * Both set is an error — refusing to guess which one to trust avoids
 * silently shipping the wrong credential when a deploy is half-migrated.
 *
 * Errors reading the file path through.
 */
export const readSecret = (
  name: string,
  env: NodeJS.ProcessEnv = process.env
): string | undefined => {
  const filePath = env[`${name}_FILE`];
  const direct = env[name];

  if (filePath !== undefined && direct !== undefined) {
    throw new Error(
      `${name} and ${name}_FILE are both set — refusing to guess which to use. Pick one.`
    );
  }

  if (filePath !== undefined) {
    return readFileSync(filePath, 'utf8').trim();
  }

  if (direct !== undefined) {
    return direct;
  }

  return undefined;
};

/**
 * Same as {@link readSecret} but throws if the secret is missing. Use for
 * credentials whose absence should fail boot immediately.
 */
export const requireSecret = (name: string, env: NodeJS.ProcessEnv = process.env): string => {
  const value = readSecret(name, env);
  if (value === undefined) {
    throw new Error(`${name} (or ${name}_FILE) is required`);
  }
  return value;
};
