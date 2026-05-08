#!/usr/bin/env node

/**
 * Real environment / secret validator (ADS-408).
 *
 * Replaces the previous URL-only check. This script:
 *  1. Loads the active .env (defaults to repo-root /.env, or --env-file=PATH).
 *  2. Validates required vars per NODE_ENV using the same rules as the
 *     backend startup validator (service.backend/src/utils/validate-env.ts).
 *  3. Diffs the active env against root /.env.example so missing or stale
 *     keys surface before deploy.
 *  4. Exits non-zero on any error so it can run as a CI gate.
 *
 * Keep the rule set in sync with service.backend/src/utils/validate-env.ts.
 * The two implementations validate the same secrets so operators get the same
 * answer pre-deploy as at boot.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
};

const log = {
  error: msg => console.error(`${colors.red}✗ ${msg}${colors.reset}`),
  success: msg => console.info(`${colors.green}✓ ${msg}${colors.reset}`),
  warn: msg => console.warn(`${colors.yellow}! ${msg}${colors.reset}`),
  info: msg => console.info(`${colors.blue}i ${msg}${colors.reset}`),
  title: msg => console.info(`${colors.bold}${colors.blue}${msg}${colors.reset}`),
};

const MIN_SECRET_LENGTH = 32;
const ENCRYPTION_KEY_HEX_LEN = 64;

// ---------------------------------------------------------------------------
// .env parsing — minimal KEY=value, ignores blank/comment lines
// ---------------------------------------------------------------------------
function parseDotEnv(content) {
  const out = {};
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

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return null;
  }
  try {
    return parseDotEnv(fs.readFileSync(envPath, 'utf8'));
  } catch (err) {
    log.error(`Failed to read ${envPath}: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Validation rules (mirror service.backend/src/utils/validate-env.ts)
// ---------------------------------------------------------------------------
function isPlaceholder(value) {
  return typeof value === 'string' && value.startsWith('CHANGE_THIS');
}

function checkSecret(name, value, errors, { required }) {
  if (!value) {
    if (required) {
      errors.push(`${name} is required`);
    }
    return;
  }
  if (value.length < MIN_SECRET_LENGTH) {
    errors.push(
      `${name} must be at least ${MIN_SECRET_LENGTH} characters long for security (got ${value.length})`
    );
  }
  if (isPlaceholder(value)) {
    errors.push(`${name} must not use the default placeholder value (CHANGE_THIS...)`);
  }
}

function checkEncryptionKey(value, errors, { required }) {
  if (!value) {
    if (required) {
      errors.push('ENCRYPTION_KEY is required');
    }
    return;
  }
  if (value.length !== ENCRYPTION_KEY_HEX_LEN) {
    errors.push(
      `ENCRYPTION_KEY must be exactly ${ENCRYPTION_KEY_HEX_LEN} hex characters (32 bytes); got ${value.length}`
    );
  } else if (!/^[0-9a-f]+$/i.test(value)) {
    errors.push('ENCRYPTION_KEY must be hex (0-9, a-f)');
  }
}

function checkDistinctSecrets(env, errors) {
  const pairs = [
    ['JWT_SECRET', 'JWT_REFRESH_SECRET'],
    ['JWT_SECRET', 'SESSION_SECRET'],
    ['JWT_SECRET', 'CSRF_SECRET'],
    ['JWT_REFRESH_SECRET', 'SESSION_SECRET'],
    ['JWT_REFRESH_SECRET', 'CSRF_SECRET'],
    ['SESSION_SECRET', 'CSRF_SECRET'],
  ];
  for (const [a, b] of pairs) {
    if (env[a] && env[b] && env[a] === env[b]) {
      errors.push(`${a} and ${b} must be distinct (reuse increases compromise blast radius)`);
    }
  }
}

function checkUrl(name, value, errors) {
  if (!value) {
    return;
  }
  try {
    new URL(value);
  } catch {
    errors.push(`${name} must be a valid URL (got "${value}")`);
  }
}

function validate(env) {
  const errors = [];
  const warnings = [];
  const nodeEnv = env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    errors.push(`NODE_ENV must be one of development|test|production (got "${nodeEnv}")`);
  }

  // Secrets — required everywhere so a dev config can't leak into prod.
  checkSecret('JWT_SECRET', env.JWT_SECRET, errors, { required: true });
  checkSecret('JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET, errors, { required: true });
  checkSecret('SESSION_SECRET', env.SESSION_SECRET, errors, { required: true });
  checkSecret('CSRF_SECRET', env.CSRF_SECRET, errors, { required: true });
  checkEncryptionKey(env.ENCRYPTION_KEY, errors, { required: true });

  if (env.JWT_REPORT_SHARE_SECRET) {
    checkSecret('JWT_REPORT_SHARE_SECRET', env.JWT_REPORT_SHARE_SECRET, errors, {
      required: false,
    });
  }

  checkDistinctSecrets(env, errors);

  // DB connection
  for (const name of ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD']) {
    if (!env[name]) {
      errors.push(`${name} is required`);
    }
  }
  if (env.DB_PORT && Number.isNaN(Number(env.DB_PORT))) {
    errors.push(`DB_PORT must be a number (got "${env.DB_PORT}")`);
  }

  // Per-env DB names (ADS-409/452/465)
  if (nodeEnv === 'development' && !env.DEV_DB_NAME) {
    errors.push('DEV_DB_NAME is required for development');
  }
  if (nodeEnv === 'test' && !env.TEST_DB_NAME) {
    errors.push('TEST_DB_NAME is required for test');
  }
  if (nodeEnv === 'production' && !env.PROD_DB_NAME) {
    errors.push('PROD_DB_NAME is required for production');
  }

  // Booleans
  for (const name of ['DB_LOGGING', 'WORKER_ENABLED', 'DEBUG_ERRORS']) {
    if (env[name] && !['true', 'false'].includes(env[name].toLowerCase())) {
      errors.push(`${name} must be 'true' or 'false' (got "${env[name]}")`);
    }
  }

  // Production-only requirements
  if (isProduction) {
    if (!env.CORS_ORIGIN) {
      errors.push('CORS_ORIGIN is required in production');
    } else if (env.CORS_ORIGIN.split(',').some(o => o.trim() === '*' || o.includes('*'))) {
      errors.push("CORS_ORIGIN cannot contain wildcard ('*') in production");
    }
    // ADS-410
    if (!env.FRONTEND_URL) {
      errors.push('FRONTEND_URL is required in production (used to build email links)');
    } else {
      checkUrl('FRONTEND_URL', env.FRONTEND_URL, errors);
    }
    if (!env.RESCUE_FRONTEND_URL) {
      errors.push('RESCUE_FRONTEND_URL is required in production (used to build email links)');
    } else {
      checkUrl('RESCUE_FRONTEND_URL', env.RESCUE_FRONTEND_URL, errors);
    }
    // ADS-411
    if (!env.STATSIG_SERVER_SECRET_KEY) {
      errors.push(
        'STATSIG_SERVER_SECRET_KEY is required in production (missing key silently disables all server-side feature flags)'
      );
    }
    // ADS-512
    if (env.DEBUG_ERRORS === 'true') {
      errors.push(
        'DEBUG_ERRORS=true is not allowed in production (leaks raw error messages to clients)'
      );
    }
    // BCRYPT_ROUNDS warning
    if (env.BCRYPT_ROUNDS && Number(env.BCRYPT_ROUNDS) < 12) {
      warnings.push('BCRYPT_ROUNDS should be at least 12 for production security');
    }
    if (env.DB_LOGGING === 'true') {
      warnings.push('DB_LOGGING is enabled in production (may log sensitive data)');
    }
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Diff: keys present in .env.example but missing from active env
// ---------------------------------------------------------------------------
function diffAgainstExample(env, examplePath) {
  if (!fs.existsSync(examplePath)) {
    return { missing: [], examplePath: null };
  }
  const example = parseDotEnv(fs.readFileSync(examplePath, 'utf8'));
  const missing = Object.keys(example).filter(key => !(key in env));
  return { missing, examplePath };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { envFile: null, examplePath: null, json: false };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--env-file=')) {
      args.envFile = arg.slice('--env-file='.length);
    } else if (arg.startsWith('--example=')) {
      args.examplePath = arg.slice('--example='.length);
    } else if (arg === '--json') {
      args.json = true;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const envFile = args.envFile ? path.resolve(args.envFile) : path.join(rootDir, '.env');
  const examplePath = args.examplePath
    ? path.resolve(args.examplePath)
    : path.join(rootDir, '.env.example');

  log.title('Environment / secret validation');
  log.info(`env file:    ${envFile}`);
  log.info(`example:     ${examplePath}`);

  const fileEnv = loadEnvFile(envFile);
  // Merge file env on top of process.env so `STATSIG_SERVER_SECRET_KEY=foo
  // npm run validate:env` works for CI. process.env wins for already-set
  // overrides (CI typically injects secrets that way).
  const env = { ...(fileEnv || {}), ...process.env };

  if (!fileEnv) {
    log.warn(`No .env file at ${envFile}; validating process.env only`);
  }

  const { errors, warnings } = validate(env);
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
