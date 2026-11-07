#!/usr/bin/env node
/**
 * `pnpm e2e:isolated` — run the Playwright suite against its own throwaway stack.
 *
 * Boots a private copy of the stack (docker-compose.e2e.yml layered on the dev
 * compose files) under its own compose project (`ads-e2e`), network, volumes,
 * secrets and host ports, seeds it, runs Playwright against it and tears it
 * down with `down -v`. The e2e run therefore never shares rate-limit counters,
 * data or saved logins with the developer's dev stack. The same overlay and
 * script run in CI (.github/actions/e2e-suite).
 *
 *   pnpm e2e:isolated                       @smoke subset (default)
 *   pnpm e2e:isolated:full                  whole suite, plus the limiter spec
 *   pnpm e2e:isolated tests/client/x.spec.ts   anything else goes to Playwright
 *   pnpm e2e:isolated --keep                leave the stack running afterwards
 *   pnpm e2e:isolated --reuse               skip boot/seed/teardown, run against
 *                                           a stack left up by --keep
 *   pnpm e2e:isolated:down                  tear a kept stack down
 *
 * Flags (everything else is passed through to `playwright test`):
 *   --full         run the whole suite (also starts the production-limits gateway)
 *   --limits       start the production-limits gateway without --full
 *   --keep         do not tear the stack down (prints the command to do it)
 *   --reuse        run Playwright against an already running, already seeded stack
 *                  (add --full or --limits if that stack was started with them)
 *   --down         tear the stack down and exit
 *   --force        skip the "dev stack is running" refusal
 *   --build        rebuild the shared dev image first
 *   --workers <n>  Playwright workers (default 3 locally; CI keeps its own default)
 *
 * Env: E2E_PROJECT (must match ads-e2e*), E2E_API_PORT / E2E_CLIENT_PORT /
 * E2E_ADMIN_PORT / E2E_RESCUE_PORT / E2E_LIMITER_PORT (14000 / 13000 / 13001 /
 * 13002 / 14001), E2E_WAIT_MINUTES (boot budget, default 30).
 *
 * Safety: every compose call carries `-p <project>` and `--env-file`. The
 * project name must match /^ads-e2e/ and must not be the checkout's own default
 * project (the dev stack), so `down -v` here can never reach the dev volumes.
 */
import { execFile, execFileSync, spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { resolveHostIds } from './docker-dev.mjs';

const execFileAsync = promisify(execFile);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STACK_DIR = join(ROOT, '.e2e-stack'); // gitignored scratch: env + redis secret
const ENV_FILE = join(STACK_DIR, 'env');
const DEV_IMAGE = 'adopt-dont-shop-dev:latest';
const GHCR_DEV_IMAGE = 'ghcr.io/ideasquared/adopt-dont-shop/dev:latest';
const DEFAULT_LOCAL_WORKERS = 3;
// Budgeted peak of the whole stack while booting (one vite build in flight plus
// ten tsx services): an estimate from the dev stack's per-container usage, not a
// measurement. The memory sampler below prints the real peak of each run. Docker Desktop VMs
// smaller than this plus headroom will swap or OOM-kill containers.
const STACK_NEEDS_GIB = 6;

const BOOLEAN_FLAGS = ['--full', '--limits', '--keep', '--reuse', '--down', '--force', '--build'];

export function parseArgs(argv) {
  const flags = new Set();
  const passthrough = [];
  let workers;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') continue;
    if (BOOLEAN_FLAGS.includes(arg)) flags.add(arg);
    else if (arg === '--workers') workers = argv[(i += 1)];
    else if (arg.startsWith('--workers=')) workers = arg.slice('--workers='.length);
    else passthrough.push(arg);
  }
  return { flags, passthrough, workers };
}

// The project must be clearly ours. The dev stack's project is the checkout
// directory name (`adopt-dont-shop`) unless COMPOSE_PROJECT_NAME says otherwise.
export function assertSafeProject(project, { root = ROOT, composeProjectName } = {}) {
  const devNames = [basename(root), 'adopt-dont-shop', composeProjectName]
    .filter(Boolean)
    .map(n => n.toLowerCase());
  if (!/^ads-e2e[a-z0-9-]*$/.test(project) || devNames.includes(project.toLowerCase())) {
    throw new Error(
      `Refusing to use compose project "${project}": it must match ads-e2e* and must not be the dev stack's project.`
    );
  }
}

// Services of a *different* compose project that mean the dev stack is up.
export function findDevProjects(psOutput, project) {
  const heavy = new Set(['service-gateway', 'database', 'app-client']);
  return [
    ...new Set(
      psOutput
        .split('\n')
        .map(line => line.trim().split('|'))
        .filter(([p, service]) => p && p !== project && heavy.has(service))
        .map(([p]) => p)
    ),
  ];
}

export function parseMemUsageMiB(text) {
  const match = /^([\d.]+)\s*(B|KiB|MiB|GiB|kB|MB|GB)/.exec(text.trim());
  if (!match) return 0;
  const value = Number(match[1]);
  const factor = {
    B: 1 / 1048576,
    KiB: 1 / 1024,
    kB: 1 / 1024,
    MiB: 1,
    MB: 1,
    GiB: 1024,
    GB: 1024,
  };
  return value * factor[match[2]];
}

const hex = bytes => randomBytes(bytes).toString('hex');
const log = message => console.log(`[e2e-isolated] ${message}`);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const minutes = ms => `${(ms / 60000).toFixed(1)} min`;

function capture(cmd, args) {
  try {
    return execFileSync(cmd, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

function main() {
  const { flags, passthrough, workers } = parseArgs(process.argv.slice(2));
  const PROJECT = process.env.E2E_PROJECT ?? 'ads-e2e';
  assertSafeProject(PROJECT, { composeProjectName: process.env.COMPOSE_PROJECT_NAME });

  const ports = {
    api: process.env.E2E_API_PORT ?? '14000',
    client: process.env.E2E_CLIENT_PORT ?? '13000',
    admin: process.env.E2E_ADMIN_PORT ?? '13001',
    rescue: process.env.E2E_RESCUE_PORT ?? '13002',
    limiter: process.env.E2E_LIMITER_PORT ?? '14001',
  };
  const withLimits = flags.has('--full') || flags.has('--limits');
  const keep = flags.has('--keep');

  const composeBase = [
    'compose',
    '-p',
    PROJECT,
    '--env-file',
    ENV_FILE,
    '-f',
    'docker-compose.yml',
    '-f',
    'docker-compose.dev.yml',
    '-f',
    'docker-compose.e2e.yml',
  ];
  // `up` only starts what this run needs; everything else (down, logs, ps) names
  // every profile so nothing of the project can be missed.
  const profileArgs = names => names.flatMap(p => ['--profile', p]);
  const upProfiles = profileArgs([
    'client',
    'admin',
    'rescue',
    'services',
    ...(withLimits ? ['limits'] : []),
  ]);
  const allProfiles = profileArgs(['client', 'admin', 'rescue', 'services', 'limits']);
  const compose = (args, { profiles = allProfiles, ...opts } = {}) =>
    spawnSync('docker', [...composeBase, ...profiles, ...args], {
      cwd: ROOT,
      stdio: 'inherit',
      ...opts,
    }).status ?? 1;
  const composeCapture = args => capture('docker', [...composeBase, ...allProfiles, ...args]);

  // Fresh secrets every boot. Hex only: they are interpolated into URLs.
  function writeStackFiles() {
    const redisPassword = hex(32);
    const { uid, gid } = resolveHostIds();
    const env = {
      NODE_ENV: 'development',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: hex(32),
      POSTGRES_DB: 'adopt_dont_shop_e2e',
      JWT_SECRET: hex(32),
      JWT_REFRESH_SECRET: hex(32),
      SESSION_SECRET: hex(32),
      ENCRYPTION_KEY: hex(32),
      PRINCIPAL_SIGNING_KEY: hex(32),
      NATS_AUTH_TOKEN: hex(32),
      REDIS_PASSWORD: redisPassword,
      GF_SECURITY_ADMIN_PASSWORD: hex(24),
      UPLOAD_SIGNING_SECRET: hex(32),
      CORS_ORIGIN: [ports.client, ports.admin, ports.rescue]
        .map(p => `http://localhost:${p}`)
        .join(','),
      HOST_UID: uid,
      HOST_GID: gid,
      E2E_PROJECT: PROJECT,
      E2E_API_PORT: ports.api,
      E2E_CLIENT_PORT: ports.client,
      E2E_ADMIN_PORT: ports.admin,
      E2E_RESCUE_PORT: ports.rescue,
      E2E_LIMITER_PORT: ports.limiter,
    };
    mkdirSync(STACK_DIR, { recursive: true });
    writeFileSync(
      ENV_FILE,
      Object.entries(env)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n') + '\n'
    );
    // Own secret file: scripts/write-redis-secret.mjs would overwrite the dev
    // stack's ./secrets/redis_password, so it is deliberately not used here.
    writeFileSync(join(STACK_DIR, 'redis_password'), redisPassword, { mode: 0o600 });
  }

  const teardown = () => {
    log(`tearing down project ${PROJECT} (down -v)`);
    return compose(['down', '-v', '--remove-orphans']);
  };

  if (flags.has('--down')) {
    if (!existsSync(ENV_FILE)) writeStackFiles(); // compose needs the env to interpolate
    process.exit(teardown());
  }

  // ---------------------------------------------------------------- preflight
  if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
    console.error('Docker daemon not reachable. Start Docker Desktop and retry.');
    process.exit(1);
  }
  const composeVersion = capture('docker', ['compose', 'version', '--short']).replace(/^v/, '');
  const [major = 0, minor = 0] = composeVersion.split('.').map(Number);
  if (major < 2 || (major === 2 && minor < 24)) {
    console.error(
      `Docker Compose >= 2.24 is required for the !override/!reset tags in docker-compose.e2e.yml (found "${composeVersion}").`
    );
    process.exit(1);
  }

  const devProjects = findDevProjects(
    capture('docker', [
      'ps',
      '--format',
      '{{.Label "com.docker.compose.project"}}|{{.Label "com.docker.compose.service"}}',
    ]),
    PROJECT
  );
  if (devProjects.length > 0 && !flags.has('--force')) {
    console.error(
      `Another compose project looks like a running dev stack: ${devProjects.join(', ')}.\n` +
        `The isolated stack is sized to fit an 8 GB Docker VM on its own, not beside the dev stack.\n` +
        `Stop it first with \`pnpm docker:down\`, or pass --force to start anyway (needs ~${STACK_NEEDS_GIB} GiB more free).`
    );
    process.exit(1);
  }
  const memTotalGiB = Number(capture('docker', ['info', '--format', '{{.MemTotal}}'])) / 1024 ** 3;
  if (memTotalGiB > 0 && memTotalGiB < STACK_NEEDS_GIB + 1) {
    log(
      `WARNING: Docker has ${memTotalGiB.toFixed(1)} GiB; the stack is budgeted at around ${STACK_NEEDS_GIB} GiB. ` +
        `Raise Docker Desktop's memory limit or expect OOM kills and a slow run.`
    );
  }

  const run = async () => {
    const started = Date.now();
    const phases = [];
    const mark = name => phases.push([name, Date.now()]);
    let peakMiB = 0;
    let sampling = true;
    const sampler = (async () => {
      while (sampling) {
        try {
          const { stdout: ids } = await execFileAsync('docker', [
            'ps',
            '-q',
            '--filter',
            `label=com.docker.compose.project=${PROJECT}`,
          ]);
          const containers = ids.split('\n').filter(Boolean);
          if (containers.length > 0) {
            const { stdout } = await execFileAsync('docker', [
              'stats',
              '--no-stream',
              '--format',
              '{{.MemUsage}}',
              ...containers,
            ]);
            const total = stdout
              .split('\n')
              .filter(Boolean)
              .reduce((sum, line) => sum + parseMemUsageMiB(line.split('/')[0]), 0);
            peakMiB = Math.max(peakMiB, total);
          }
        } catch {
          /* sampling is best effort */
        }
        await sleep(10_000);
      }
    })();

    let code = 1;
    const reuse = flags.has('--reuse');
    try {
      if (reuse) {
        if (!existsSync(ENV_FILE)) throw new Error('--reuse needs a stack left up with --keep');
      } else {
        ensureImage(flags.has('--build'));
        // Start from nothing: a leftover project would have the previous run's
        // data and a database password that no longer matches the new secrets.
        if (existsSync(ENV_FILE)) teardown();
        writeStackFiles();
        mark('image');

        log(`booting ${PROJECT} (apps are built in-container, one at a time; first run is slow)`);
        if (compose(['up', '-d', '--no-build'], { profiles: upProfiles }) !== 0) {
          throw new Error('docker compose up failed');
        }
        await waitForStack();
        mark('boot');

        const apiUrl = `http://localhost:${ports.api}`;
        log(`seeding personas through ${apiUrl}`);
        const seed = spawnSync('node', ['scripts/seed.mjs', '--api-only'], {
          cwd: ROOT,
          stdio: 'inherit',
          env: { ...process.env, SEED_API_URL: apiUrl },
        });
        if (seed.status !== 0) throw new Error('persona seed failed');
        mark('seed');
      }

      const pwArgs =
        passthrough.length > 0 ? passthrough : flags.has('--full') ? [] : ['--grep', '@smoke'];
      const env = {
        ...process.env,
        E2E_API_URL: `http://localhost:${ports.api}`,
        E2E_CLIENT_URL: `http://localhost:${ports.client}`,
        E2E_ADMIN_URL: `http://localhost:${ports.admin}`,
        E2E_RESCUE_URL: `http://localhost:${ports.rescue}`,
        E2E_AUTH_DIR: '.auth-isolated',
        E2E_BLOCK_SERVICE_WORKERS: '1',
        E2E_RUN_ID: process.env.E2E_RUN_ID ?? `isolated-${Date.now()}`,
        ...(withLimits ? { E2E_LIMITER_GATEWAY_URL: `http://localhost:${ports.limiter}` } : {}),
        ...(workers || !process.env.CI
          ? { E2E_WORKERS: String(workers ?? DEFAULT_LOCAL_WORKERS) }
          : {}),
      };
      log(
        `running Playwright: ${pwArgs.join(' ') || '(whole suite)'} [workers=${env.E2E_WORKERS ?? 'ci default'}]`
      );
      code = await new Promise(resolve => {
        const child = spawn(
          'pnpm',
          ['--filter', '@adopt-dont-shop/e2e', 'exec', 'playwright', 'test', ...pwArgs],
          { cwd: ROOT, stdio: 'inherit', env, shell: process.platform === 'win32' }
        );
        child.on('exit', status => resolve(status ?? 1));
      });
      mark('tests');
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
    }

    sampling = false;
    if (code !== 0) dumpDiagnostics();
    if (!keep && !reuse) teardown();
    else if (keep) {
      log(`left running. Stop with: pnpm e2e:isolated:down`);
      log(`re-run specs against it with: pnpm e2e:isolated --reuse <playwright args>`);
    }
    await sampler;

    let previous = started;
    const timings = phases.map(([name, at]) => {
      const text = `${name} ${minutes(at - previous)}`;
      previous = at;
      return text;
    });
    log(
      `${timings.join(', ')}, total ${minutes(Date.now() - started)}; peak stack memory ~${(peakMiB / 1024).toFixed(1)} GiB (sampled)`
    );
    process.exit(code);
  };

  function ensureImage(rebuild) {
    const exists = () =>
      spawnSync('docker', ['image', 'inspect', DEV_IMAGE], { stdio: 'ignore' }).status === 0;
    if (exists() && !rebuild) return;
    // Same image as the dev stack. Prefer the prebuilt one from GHCR, as
    // scripts/docker-dev.mjs does, and fall back to a local build.
    if (
      !rebuild &&
      spawnSync('docker', ['pull', GHCR_DEV_IMAGE], { stdio: 'ignore' }).status === 0
    ) {
      spawnSync('docker', ['tag', GHCR_DEV_IMAGE, DEV_IMAGE], { stdio: 'ignore' });
      return;
    }
    log('building the shared dev image (one full workspace install)');
    if (!existsSync(ENV_FILE)) writeStackFiles();
    if (compose(['build', 'app-admin']) !== 0) throw new Error('dev image build failed');
  }

  async function waitForStack() {
    const budgetMs = Number(process.env.E2E_WAIT_MINUTES ?? 30) * 60_000;
    const deadline = Date.now() + budgetMs;
    const urls = [
      `http://localhost:${ports.api}/health/simple`,
      ...[ports.client, ports.admin, ports.rescue].map(p => `http://localhost:${p}`),
      ...(withLimits ? [`http://localhost:${ports.limiter}/health/simple`] : []),
    ];
    let lastReport = 0;
    while (Date.now() < deadline) {
      const waiting = notReady();
      if (waiting.length === 0 && (await Promise.all(urls.map(isUp))).every(Boolean)) {
        log('stack is up');
        return;
      }
      if (Date.now() - lastReport > 30_000) {
        log(`waiting for: ${waiting.join(', ') || urls.join(', ')}`);
        lastReport = Date.now();
      }
      await sleep(5_000);
    }
    throw new Error(`stack did not become healthy within ${minutes(budgetMs)}`);
  }

  // A service is ready when it is running and, if it has a healthcheck, healthy.
  // Crash-restarting containers (a service racing lib.types' first tsc build)
  // simply stay "not ready" until the restart that sticks.
  function notReady() {
    const rows = composeCapture(['ps', '--all', '--format', 'json'])
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return undefined;
        }
      })
      .filter(Boolean);
    if (rows.length === 0) return ['(no containers yet)'];
    return rows
      .filter(row => row.State !== 'running' || (row.Health && row.Health !== 'healthy'))
      .map(row => row.Service);
  }

  async function isUp(url) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
      return response.status < 500;
    } catch {
      return false;
    }
  }

  function dumpDiagnostics() {
    log('run failed: container status and recent logs follow');
    compose(['ps', '--all']);
    compose(['logs', '--no-color', '--tail=100']);
    // Full logs for CI's artifact upload (.github/actions/e2e-suite).
    const full = spawnSync('docker', [...composeBase, ...allProfiles, 'logs', '--no-color'], {
      cwd: ROOT,
      maxBuffer: 512 * 1024 * 1024,
    });
    if (full.stdout) writeFileSync(join(ROOT, 'docker-compose.log'), full.stdout);
  }

  process.on('SIGINT', () => {
    if (!keep) teardown();
    process.exit(130);
  });

  return run();
}

// Only run when invoked directly, so scripts/e2e-isolated.test.mjs can import
// the pure helpers without touching Docker.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
  }
}
