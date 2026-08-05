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

// ADS-1047: reject obvious `.env.example` placeholders at boot in production.
// The length/hex checks below let a `CHANGE_THIS…`-style value (>= the byte
// floor) boot cleanly, so a deploy that forgot to substitute real secrets runs
// with a known, guessable credential. Match the repo-wide `CHANGE_THIS`
// placeholder convention (see `.env.example` and lib.validation's env schema).
// Production-gated only: dev/test/e2e legitimately use throwaway values.
const PLACEHOLDER_PREFIX = 'change_this';

const isPlaceholderValue = (value: string): boolean =>
  value.toLowerCase().startsWith(PLACEHOLDER_PREFIX);

const assertNotPlaceholder = (name: string, value: string, env: NodeJS.ProcessEnv): void => {
  if (env.NODE_ENV === 'production' && isPlaceholderValue(value)) {
    throw new Error(
      `${name} is set to a placeholder value — replace it with a real secret before deploying to production`
    );
  }
};

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
 * Same as {@link readSecret} but throws if the secret is missing or blank.
 * Use for credentials whose absence should fail boot immediately.
 *
 * The optional `description` is appended to the error message to match the
 * per-service phrasing: `"${name} is required (${description})"`.
 * When omitted the message is `"${name} is required"`.
 *
 * Pass `opts.minBytes` to additionally reject a present-but-too-short secret
 * — used for HMAC signing keys where a weak secret is offline-brute-forceable
 * and would let an attacker forge tokens platform-wide.
 *
 * Pass `opts.pattern` to additionally reject a present value whose shape is
 * wrong — e.g. a hex key that must be exactly 64 lower-case hex chars. The
 * pattern is matched against the trimmed value; a mismatch throws.
 */
export const requireSecret = (
  name: string,
  env: NodeJS.ProcessEnv = process.env,
  description?: string,
  opts?: { minBytes?: number; pattern?: RegExp }
): string => {
  const value = readSecret(name, env)?.trim();
  if (!value) {
    const detail = description !== undefined ? ` (${description})` : '';
    throw new Error(`${name} is required${detail}`);
  }
  assertNotPlaceholder(name, value, env);
  if (opts?.minBytes !== undefined && Buffer.byteLength(value, 'utf8') < opts.minBytes) {
    throw new Error(`${name} must be at least ${opts.minBytes} bytes`);
  }
  if (opts?.pattern !== undefined && !opts.pattern.test(value)) {
    throw new Error(`${name} does not match the required format`);
  }
  return value;
};

/**
 * Convenience wrapper over {@link requireSecret} for hex-encoded secrets such
 * as a 32-byte ENCRYPTION_KEY supplied as 64 hex chars. Lower-cases the value
 * before validating (so an upper-case hex key is accepted + normalised) and
 * requires exactly `bytes` bytes' worth of hex (`bytes * 2` chars). Defaults
 * to 32 bytes. A missing/blank secret throws the same `${name} is required`
 * error as {@link requireSecret}.
 */
export const requireHexSecret = (
  name: string,
  env: NodeJS.ProcessEnv = process.env,
  opts?: { bytes?: number; description?: string }
): string => {
  const bytes = opts?.bytes ?? 32;
  const raw = readSecret(name, env)?.trim();
  if (!raw) {
    const detail = opts?.description !== undefined ? ` (${opts.description})` : '';
    throw new Error(`${name} is required${detail}`);
  }
  const value = raw.toLowerCase();
  if (!new RegExp(`^[0-9a-f]{${bytes * 2}}$`).test(value)) {
    throw new Error(`${name} does not match the required format`);
  }
  return value;
};

/**
 * Parse a port number from a raw env-var string.
 *
 * - When `raw` is absent or blank, returns `fallback`.
 * - When `raw` is present but not a positive integer, throws naming `name`.
 *
 * Error message format: `"${name} must be a positive integer, got \"${trimmed}\""`.
 * This preserves the exact wording the services produced locally so boot
 * errors don't change after migration.
 */
export const parsePort = (raw: string | undefined, fallback: number, name: string): number => {
  const trimmed = raw?.trim();
  const value = trimmed ? Number.parseInt(trimmed, 10) : fallback;
  if (Number.isNaN(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got "${trimmed}"`);
  }
  return value;
};

/**
 * Assert that a service's own signing/encryption secrets are all distinct
 * (ADS-1047). Reusing one value for two secrets (e.g. `JWT_SECRET` ===
 * `JWT_REFRESH_SECRET`) means a single disclosure compromises both, defeating
 * the reason they are separate keys. `config-secrets` only sees one service's
 * secrets, so this covers intra-service reuse; cross-service distinctness is a
 * deploy-time concern (scripts/validate-env.ts).
 *
 * Production-gated: dev/test may reuse throwaway values. Pass the resolved
 * values keyed by their env-var name so the error can name the offending pair.
 */
export const requireDistinctSecrets = (
  secrets: Record<string, string>,
  env: NodeJS.ProcessEnv = process.env
): void => {
  if (env.NODE_ENV !== 'production') {
    return;
  }
  const seenByValue = new Map<string, string>();
  for (const [name, value] of Object.entries(secrets)) {
    const previousName = seenByValue.get(value);
    if (previousName !== undefined) {
      throw new Error(
        `${previousName} and ${name} must be distinct — reusing a secret widens the blast radius of a single disclosure`
      );
    }
    seenByValue.set(value, name);
  }
};
