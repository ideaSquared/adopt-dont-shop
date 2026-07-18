#!/usr/bin/env tsx
/* eslint-disable no-console -- CLI tool: stdout is the deliverable. */
/**
 * Real environment / secret validator (ADS-408, ADS-707).
 *
 * This script:
 *  1. Loads the active .env (defaults to repo-root /.env, or --env-file=PATH).
 *  2. Validates required vars per NODE_ENV using the shared Zod schema in
 *     `@adopt-dont-shop/lib.validation` — the same source of truth the backend
 *     boot validator (`validateEnvironment`) consumes.
 *  3. Diffs the active env against root /.env.example so missing or stale
 *     keys surface before deploy.
 *  4. Exits non-zero on any error so it can run as a CI gate.
 *  5. Optional --staging-env=PATH: fails if any of the five application secrets
 *     share a value with the staging env (prevents staging→prod secret reuse,
 *     ADS-659).
 *
 * Run via tsx (`pnpm validate:env`). The import below uses a relative
 * source path so the CLI works in CI before `pnpm build:libs` has built
 * `packages/lib.validation/dist`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEnv } from '../packages/lib.validation/src/schemas/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
} as const;

const log = {
  error: (msg: string): void => console.error(`${colors.red}✗ ${msg}${colors.reset}`),
  success: (msg: string): void => console.info(`${colors.green}✓ ${msg}${colors.reset}`),
  warn: (msg: string): void => console.warn(`${colors.yellow}! ${msg}${colors.reset}`),
  info: (msg: string): void => console.info(`${colors.blue}i ${msg}${colors.reset}`),
  title: (msg: string): void => console.info(`${colors.bold}${colors.blue}${msg}${colors.reset}`),
};

type EnvMap = Record<string, string | undefined>;

// ---------------------------------------------------------------------------
// .env parsing — minimal KEY=value, ignores blank/comment lines
// ---------------------------------------------------------------------------
function parseDotEnv(content: string): EnvMap {
  const out: EnvMap = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    if (!/^[A-Z0-9_]+$/i.test(key)) {
      continue;
    }
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadEnvFile(envPath: string): EnvMap | null {
  if (!fs.existsSync(envPath)) {
    return null;
  }
  try {
    return parseDotEnv(fs.readFileSync(envPath, 'utf8'));
  } catch (err) {
    log.error(`Failed to read ${envPath}: ${(err as Error).message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Diff: keys present in .env.example but missing from active env
// ---------------------------------------------------------------------------
function diffAgainstExample(
  env: EnvMap,
  examplePath: string
): { missing: string[]; examplePath: string | null } {
  if (!fs.existsSync(examplePath)) {
    return { missing: [], examplePath: null };
  }
  const example = parseDotEnv(fs.readFileSync(examplePath, 'utf8'));
  const missing = Object.keys(example).filter(key => !(key in env));
  return { missing, examplePath };
}

// ---------------------------------------------------------------------------
// Staging-reuse check (ADS-659)
// Fails if any of the five application secrets share a value with a staging env.
// ---------------------------------------------------------------------------
const SECRET_VARS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_SECRET',
  'ENCRYPTION_KEY',
  'UPLOAD_SIGNING_SECRET',
] as const;

function checkStagingReuse(prodEnv: EnvMap, stagingPath: string, errors: string[]): void {
  const stagingEnv = loadEnvFile(stagingPath);
  if (!stagingEnv) {
    log.warn(`--staging-env file not found at ${stagingPath}; skipping reuse check`);
    return;
  }
  for (const key of SECRET_VARS) {
    const prodVal = prodEnv[key];
    const stagingVal = stagingEnv[key];
    if (prodVal && stagingVal && prodVal === stagingVal) {
      errors.push(`${key} is identical in production and staging — rotate before deploying`);
    }
  }
}

type Args = {
  envFile: string | null;
  examplePath: string | null;
  stagingEnv: string | null;
  json: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { envFile: null, examplePath: null, stagingEnv: null, json: false };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--env-file=')) {
      args.envFile = arg.slice('--env-file='.length);
    } else if (arg.startsWith('--example=')) {
      args.examplePath = arg.slice('--example='.length);
    } else if (arg.startsWith('--staging-env=')) {
      args.stagingEnv = arg.slice('--staging-env='.length);
    } else if (arg === '--json') {
      args.json = true;
    }
  }
  return args;
}

function main(): void {
  const args = parseArgs(process.argv);
  const envFile = args.envFile ? path.resolve(args.envFile) : path.join(rootDir, '.env');
  const examplePath = args.examplePath
    ? path.resolve(args.examplePath)
    : path.join(rootDir, '.env.example');

  log.title('Environment / secret validation');
  log.info(`env file:    ${envFile}`);
  log.info(`example:     ${examplePath}`);
  if (args.stagingEnv) {
    log.info(`staging env: ${path.resolve(args.stagingEnv)}`);
  }

  const fileEnv = loadEnvFile(envFile);
  // Merge file env on top of process.env so `STATSIG_SERVER_SECRET_KEY=foo
  // pnpm validate:env` works for CI. process.env wins for already-set
  // overrides (CI typically injects secrets that way).
  const env: EnvMap = { ...(fileEnv ?? {}), ...process.env };

  if (!fileEnv) {
    log.warn(`No .env file at ${envFile}; validating process.env only`);
  }

  const result = validateEnv(env);
  // Schema messages already include the variable name (e.g. "JWT_SECRET is
  // required"), so the path prefix would duplicate it in the human output.
  const errors = result.errors.map(e => e.message);
  const warnings = result.warnings.map(w => w.message);

  if (args.stagingEnv) {
    checkStagingReuse(env, path.resolve(args.stagingEnv), errors);
  }

  const { missing, examplePath: foundExample } = diffAgainstExample(env, examplePath);

  if (foundExample && missing.length > 0) {
    log.warn(`${missing.length} key(s) in .env.example missing from active env:`);
    for (const key of missing) {
      console.info(`    - ${key}`);
    }
  } else if (foundExample) {
    log.success('All keys from .env.example are present in active env');
  }

  if (warnings.length > 0) {
    log.warn(`${warnings.length} warning(s):`);
    for (const w of warnings) {
      console.warn(`    - ${w}`);
    }
  }

  if (args.json) {
    console.info(
      JSON.stringify(
        { ok: errors.length === 0, errors, warnings, missingFromExample: missing },
        null,
        2
      )
    );
  }

  if (errors.length > 0) {
    log.error(`Validation failed with ${errors.length} error(s):`);
    for (const e of errors) {
      console.error(`    - ${e}`);
    }
    process.exit(1);
  }

  log.success('Environment validation passed');
  process.exit(0);
}

main();
