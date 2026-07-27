#!/usr/bin/env node
/**
 * `pnpm docker:dev` — the one command to run the full dev stack.
 *
 * Goal: it should ALWAYS work, on Windows / macOS / Linux, no matter what state
 * the machine is in. It does the boring, error-prone checks a developer would
 * otherwise hit one cryptic failure at a time:
 *
 *   1. Docker daemon running?
 *   2. .env present (with non-placeholder secrets)?
 *   3. Host port 6379 (Redis) actually bindable? On Windows the Hyper-V dynamic
 *      port range frequently reserves it -> we detect and explain the fix.
 *   4. pnpm-lock.yaml changed since last run? -> force the installer to re-run so
 *      the shared node_modules volume can't go stale.
 *   5. Postgres data volume password matches the current .env? A volume left over
 *      from an older .env authenticates with the OLD password and every service
 *      crash-loops on "password authentication failed". We detect the mismatch
 *      and PROMPT before wiping (never destroy data silently).
 *
 * Then it brings the stack up via the base compose file + the dev override.
 *
 * Flags:
 *   --detach / -d   Start in the background.
 *   --build         Force-rebuild the (tiny) dev image.
 *   --profile <p>   Compose profile (default: full).
 *   --yes           Non-interactive: assume "yes" to safe prompts (NOT to DB wipe).
 */
import { execSync, spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { platform } from 'os';
import { createHash } from 'crypto';
import { writeRedisPasswordSecret } from './write-redis-secret.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

const log = (m, c = RESET) => console.log(`${c}${m}${RESET}`);
const step = m => log(`${BOLD}▶${RESET} ${m}`, BLUE);
const ok = m => log(`${GREEN}✓${RESET} ${m}`);
const warn = m => log(`${YELLOW}!${RESET} ${m}`, YELLOW);
const fail = m => log(`${RED}✗ ${m}${RESET}`, RED);

const argv = process.argv.slice(2);
const hasFlag = (...names) => names.some(n => argv.includes(n));
const flagValue = name => {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : undefined;
};

const DETACH = hasFlag('--detach', '-d');
const BUILD = hasFlag('--build');
const ASSUME_YES = hasFlag('--yes');
const PROFILE = flagValue('--profile') ?? 'full';

const COMPOSE = ['-f', 'docker-compose.yml', '-f', 'docker-compose.dev.yml'];
const STATE_FILE = join(ROOT, '.turbo', '.docker-dev-state.json'); // gitignored .turbo

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
}

function sleepSync(ms) {
  // Block the main thread without spawning anything (portable across OSes).
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function capture(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

function promptYesNo(question, defaultYes) {
  if (ASSUME_YES) return Promise.resolve(defaultYes);
  if (!process.stdin.isTTY) return Promise.resolve(defaultYes);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const suffix = defaultYes ? ' (Y/n) ' : ' (y/N) ';
  return new Promise(resolve => {
    rl.question(`${question}${suffix}`, answer => {
      rl.close();
      const a = answer.trim().toLowerCase();
      if (a === '') return resolve(defaultYes);
      resolve(a === 'y' || a === 'yes');
    });
  });
}

// --- 0. Host uid/gid for the dev image's non-root step-down (ADS-881) ------
// Dockerfile.dev's entrypoint (scripts/docker-dev-entrypoint.sh) renumbers
// its baked dev user to HOST_UID/HOST_GID before dropping root, so the
// container's writes into the bind-mounted source (`.:/app`) behave exactly
// like the host developer's own. process.getuid/getgid are POSIX-only
// (undefined on Windows) — leaving them unset there falls back to the
// compose file's default of 1000, which matches the image's baked dev user.
function setHostUidGid() {
  if (typeof process.getuid !== 'function') return;
  process.env.HOST_UID = String(process.getuid());
  process.env.HOST_GID = String(process.getgid());
}

// --- 1. Docker daemon ------------------------------------------------------
function checkDocker() {
  step('Checking Docker daemon');
  try {
    execSync('docker info', { stdio: 'ignore' });
    ok('Docker is running');
  } catch {
    fail('Docker daemon not reachable. Start Docker Desktop and retry.');
    process.exit(1);
  }
}

// --- 2. .env ---------------------------------------------------------------
function checkEnv() {
  step('Checking .env');
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) {
    fail('.env not found. Run `pnpm bootstrap` (or copy .env.example) first.');
    process.exit(1);
  }
  const contents = readFileSync(envPath, 'utf8');
  // ADS-968: GF_SECURITY_ADMIN_PASSWORD is required because the default
  // `full` profile starts Grafana, and docker-compose.yml refuses to
  // interpolate it unset — check it here too for a friendlier error.
  const required = ['POSTGRES_PASSWORD', 'REDIS_PASSWORD', 'JWT_SECRET', 'GF_SECURITY_ADMIN_PASSWORD'];
  const missing = required.filter(k => {
    const m = contents.match(new RegExp(`^${k}=(.*)$`, 'm'));
    return !m || m[1].trim() === '';
  });
  if (missing.length) {
    fail(`.env missing values for: ${missing.join(', ')}. Run \`pnpm secrets:generate\`.`);
    process.exit(1);
  }
  ok('.env present with required keys');
  return contents;
}

// --- 3. Redis host port (Windows reserved-range trap) ----------------------
// The dev override binds Redis on the host at REDIS_HOST_PORT (default 6380) to
// dodge the 6379 reserved-range trap. We verify the EFFECTIVE host port is
// bindable; if it too is reserved, we suggest the next free port instead of the
// admin winnat dance.
function portReservedOnWindows(port, excluded) {
  return excluded
    .split('\n')
    .map(l => l.trim().match(/^(\d+)\s+(\d+)/))
    .filter(Boolean)
    .some(([, lo, hi]) => port >= Number(lo) && port <= Number(hi));
}

function checkRedisPort() {
  const envText = readFileSync(join(ROOT, '.env'), 'utf8');
  const hostPort = Number((envText.match(/^REDIS_HOST_PORT=(.*)$/m) || [])[1]?.trim() || 6380);
  step(`Checking host port ${hostPort} (Redis)`);
  if (platform() !== 'win32') {
    ok('Non-Windows host — skipping reserved-range check');
    return;
  }
  const excluded = capture('netsh interface ipv4 show excludedportrange protocol=tcp');
  if (!portReservedOnWindows(hostPort, excluded)) {
    ok(`Port ${hostPort} is bindable`);
    return;
  }
  // Find the next non-reserved port above the current one to suggest.
  let suggestion = hostPort + 1;
  while (suggestion < 6500 && portReservedOnWindows(suggestion, excluded)) suggestion++;
  warn(`Port ${hostPort} falls inside a Windows reserved port range (Hyper-V/WSL2).`);
  log(`  This only affects host-side access to Redis; services use the docker`, YELLOW);
  log(`  network and are unaffected. Set a free host port in .env and re-run:`, YELLOW);
  log(`    REDIS_HOST_PORT=${suggestion}`, BOLD);
  fail('Set REDIS_HOST_PORT to a free port (above) in .env, then re-run `pnpm docker:dev`.');
  process.exit(1);
}

// --- 4. Build-input drift -> rebuild the dev image -------------------------
// The dev image bakes deps, so it must rebuild when the lockfile OR the
// Dockerfile that produces it changes.
function buildInputHash() {
  const h = createHash('sha256');
  for (const f of ['pnpm-lock.yaml', 'Dockerfile.dev']) {
    const p = join(ROOT, f);
    if (existsSync(p)) h.update(readFileSync(p));
  }
  return h.digest('hex');
}

function readState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeState(state) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {
    /* .turbo may not exist yet on a clean checkout; harmless */
  }
}

// Dependencies are baked into the dev image, so a lockfile change means the
// image must be rebuilt. Returns true if a rebuild is needed.
function needsImageRebuild() {
  step('Checking dev image freshness (lockfile + Dockerfile)');
  const current = buildInputHash();
  const state = readState();
  const imageExists = !!capture('docker image ls -q adopt-dont-shop-dev:latest');
  let rebuild = false;
  if (!imageExists) {
    warn('Dev image not built yet — will build it.');
    rebuild = true;
  } else if (state.buildHash && state.buildHash !== current) {
    warn('Lockfile or Dockerfile.dev changed since last run — rebuilding the dev image.');
    rebuild = true;
  } else {
    ok('Build inputs unchanged, dev image present');
  }
  state.buildHash = current;
  writeState(state);
  return rebuild;
}

// --- 5. Stale Postgres volume (password mismatch) --------------------------
async function checkPostgresVolume() {
  step('Checking Postgres data volume');
  const volExists = capture('docker volume ls --format "{{.Name}}"')
    .split('\n')
    .some(v => v.endsWith('_postgres_data'));
  if (!volExists) {
    ok('No existing Postgres volume — will initialise fresh from .env');
    return;
  }
  // Probe: start the DB alone (if not up) and try to auth with the current .env
  // password. Mismatch => the volume was initialised with an older password.
  const pw = (readFileSync(join(ROOT, '.env'), 'utf8').match(/^POSTGRES_PASSWORD=(.*)$/m) || [])[1]?.trim();
  const user = (readFileSync(join(ROOT, '.env'), 'utf8').match(/^POSTGRES_USER=(.*)$/m) || [])[1]?.trim() || 'adopt_user';
  const db = (readFileSync(join(ROOT, '.env'), 'utf8').match(/^POSTGRES_DB=(.*)$/m) || [])[1]?.trim() || 'adopt_dont_shop_dev';

  run(`docker compose ${COMPOSE.join(' ')} up -d database`, { stdio: 'ignore' });
  // Give it a moment to accept connections, then probe via pg_isready + a real auth.
  let authed = false;
  for (let i = 0; i < 15; i++) {
    const probe = spawnSync(
      'docker',
      ['compose', ...COMPOSE, 'exec', '-e', `PGPASSWORD=${pw}`, '-T', 'database',
        'psql', '-U', user, '-d', db, '-c', 'select 1'],
      { cwd: ROOT, stdio: 'ignore' }
    );
    if (probe.status === 0) { authed = true; break; }
    sleepSync(1000); // portable blocking sleep
  }
  if (authed) {
    ok('Postgres volume password matches .env');
    return;
  }
  warn('Existing Postgres volume rejects the current .env password.');
  log('  This happens when POSTGRES_PASSWORD changed after the volume was first', YELLOW);
  log('  created (Postgres only sets the password on first init). The fix is to', YELLOW);
  log('  WIPE the dev database volume and let it re-initialise.', YELLOW);
  const wipe = await promptYesNo(
    `${RED}Wipe the local dev database now? This deletes all local DB data.${RESET}`,
    false
  );
  if (!wipe) {
    fail('Cannot start with a mismatched DB volume. Re-run when ready to wipe, or fix POSTGRES_PASSWORD to match the volume.');
    process.exit(1);
  }
  run(`docker compose ${COMPOSE.join(' ')} down -v`);
  ok('Database volume wiped — will re-initialise fresh');
}

const GHCR_DEV_IMAGE = 'ghcr.io/ideasquared/adopt-dont-shop/dev:latest';
const LOCAL_DEV_IMAGE = 'adopt-dont-shop-dev:latest';

// Try to pull the prebuilt dev image from GHCR and tag it as the local image
// the compose stack expects. This is the fast path: most developers never build
// (the original network-flakiness source). Returns true on success.
// Skipped when --build is passed or the local Dockerfile.dev differs from what
// CI published (we can't tell that cheaply, so a Dockerfile.dev change bumps the
// build-input hash and the caller forces a local build instead of pulling).
function tryPullDevImage() {
  step('Pulling prebuilt dev image from GHCR');
  const pulled = spawnSync('docker', ['pull', GHCR_DEV_IMAGE], { cwd: ROOT, stdio: 'ignore' });
  if (pulled.status !== 0) {
    warn('Could not pull from GHCR (not published yet, or not logged in) — building locally.');
    return false;
  }
  spawnSync('docker', ['tag', GHCR_DEV_IMAGE, LOCAL_DEV_IMAGE], { cwd: ROOT, stdio: 'ignore' });
  ok('Using prebuilt dev image from GHCR');
  return true;
}

// Build the ONE shared dev image a single time. Every app/service references
// the same image (adopt-dont-shop-dev:latest); letting `up --build` build it
// per-service races on the image export ("image already exists"). So build it
// once via a single service, then up without --build.
function buildDevImage() {
  step('Building shared dev image (one full workspace install)');
  run(`docker compose ${COMPOSE.join(' ')} build app-admin`);
  ok('Dev image built');
}

// --- bring the stack up ----------------------------------------------------
// A single frontend profile (client/admin/rescue) must also enable the
// `services` profile — otherwise the app boots without the gateway and every
// /api call 502s through the Vite proxy. `full` already includes everything.
function resolveProfiles(profile) {
  return ['client', 'admin', 'rescue'].includes(profile)
    ? [profile, 'services']
    : [profile];
}

function up() {
  const profiles = resolveProfiles(PROFILE);
  step(`Starting stack (profile: ${profiles.join(', ')}${DETACH ? ', detached' : ''})`);
  const profileArgs = profiles.flatMap(p => ['--profile', p]);
  const parts = ['docker compose', ...COMPOSE, ...profileArgs, 'up'];
  if (DETACH) parts.push('-d');
  run(parts.join(' '));
}

(async () => {
  log('');
  log(`${BOLD}Adopt Don't Shop — dev stack${RESET}`);
  log('');
  setHostUidGid();
  checkDocker();
  checkEnv();
  step('Writing secrets/redis_password from .env');
  writeRedisPasswordSecret();
  ok('secrets/redis_password written');
  checkRedisPort();
  const rebuild = needsImageRebuild();
  if (BUILD) {
    // Explicit --build: always build locally (use this after editing
    // Dockerfile.dev or the lockfile on your branch).
    buildDevImage();
  } else if (rebuild) {
    // Image missing or build inputs changed: prefer GHCR's prebuilt image,
    // fall back to a local build if the pull fails.
    if (!tryPullDevImage()) buildDevImage();
  }
  await checkPostgresVolume();
  up();
  if (DETACH) {
    log('');
    ok('Stack started in background.');
    log(`  Logs:  ${BOLD}pnpm docker:logs${RESET}`);
    log(`  Stop:  ${BOLD}pnpm docker:down${RESET}`);
  }
})().catch(err => {
  fail(err.message);
  process.exit(1);
});
