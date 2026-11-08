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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
// Peak of the whole stack while booting (three Vite dev servers plus ten tsx
// services): 6.9 GiB sampled on a GitHub runner. The memory sampler below prints
// the real peak of each run. Docker VMs smaller than this swap or OOM-kill.
const STACK_NEEDS_GIB = 7;

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

// A service that dies or sticks unhealthy during boot is restarted ONCE, then
// reported. The dev image runs services under `tsx watch`, which keeps the
// container "Up" after the app exits, so Compose's `restart:` policy never
// fires and the boot would otherwise stall until the wait budget runs out.
//
// Unhealthy only counts after this grace: the healthcheck's start_period is 40s,
// then it needs 5 failed 10s checks to flip, and a service racing the first
// lib.types build legitimately takes a while to settle.
export const UNHEALTHY_GRACE_MS = 120_000;
// After a restart, `compose ps` can briefly still show the old state.
export const RESTART_SETTLE_MS = 10_000;
const LOG_TAIL_LINES = 40;
const SERVICE_NAME = /^[a-z0-9][a-z0-9_-]*$/;

// Which containers need a restart, and which have failed twice. Pure: `state`
// ({ unhealthySince, restartedAt }, both service -> ms) is read, never mutated,
// and the next state is returned.
export function planRestarts(rows, state, now) {
  const unhealthySince = { ...state.unhealthySince };
  const restartedAt = { ...state.restartedAt };
  const restart = [];
  const giveUp = [];
  for (const row of rows) {
    const service = row.Service;
    const exited = row.State === 'exited' || row.State === 'dead';
    const unhealthy = row.State === 'running' && row.Health === 'unhealthy';
    if (!exited && !unhealthy) {
      delete unhealthySince[service];
      continue;
    }
    if (unhealthy && unhealthySince[service] === undefined) unhealthySince[service] = now;
    const unhealthyForMs = unhealthy ? now - unhealthySince[service] : 0;
    if (!exited && unhealthyForMs < UNHEALTHY_GRACE_MS) continue;
    const reason = exited
      ? `exited (code ${row.ExitCode ?? '?'})`
      : `unhealthy for ${Math.round(unhealthyForMs / 1000)}s`;
    if (restartedAt[service] === undefined) {
      restart.push({ service, reason });
      restartedAt[service] = now;
      delete unhealthySince[service];
    } else if (now - restartedAt[service] >= RESTART_SETTLE_MS) {
      giveUp.push({ service, reason });
    }
  }
  return { restart, giveUp, state: { unhealthySince, restartedAt } };
}

// Acts on planRestarts: restart each service once (logged), and throw, naming
// the service and its last log lines, when one fails again. Returns the next state.
export function superviseServices(rows, state, now, { restartService, tailLogs, log }) {
  const plan = planRestarts(rows, state, now);
  for (const { service } of [...plan.restart, ...plan.giveUp]) {
    if (!SERVICE_NAME.test(service)) throw new Error(`unexpected service name "${service}"`);
  }
  for (const { service, reason } of plan.restart) {
    log(`restarting ${service}: it ${reason} (each service is restarted once)`);
    restartService(service);
  }
  const [failed] = plan.giveUp;
  if (failed) {
    throw new Error(
      `${failed.service} ${failed.reason} again after a restart; giving up. ` +
        `Last ${LOG_TAIL_LINES} log lines:\n${tailLogs(failed.service, LOG_TAIL_LINES)}`
    );
  }
  return plan.state;
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

// KEY=VALUE lines of a dotenv-style file (the saved stack env, the checkout's .env).
function readEnvFile(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split('\n')
      .map(line => /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim()))
      .filter(Boolean)
      .map(([, key, value]) => [key, value])
  );
}

// Compose lets variables exported in the shell win over --env-file, so the saved
// stack values are passed explicitly to every Compose subprocess.
const stackEnv = () => ({ ...process.env, ...readEnvFile(ENV_FILE) });

function capture(cmd, args, env) {
  try {
    return execFileSync(cmd, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], env })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

function main() {
  const { flags, passthrough, workers } = parseArgs(process.argv.slice(2));
  const PROJECT = process.env.E2E_PROJECT ?? 'ads-e2e';
  // The dev launcher lets Compose read COMPOSE_PROJECT_NAME from the checkout's
  // .env as well as the shell; neither may name the project we are about to wipe.
  for (const name of [
    process.env.COMPOSE_PROJECT_NAME,
    readEnvFile(join(ROOT, '.env')).COMPOSE_PROJECT_NAME,
  ]) {
    assertSafeProject(PROJECT, { composeProjectName: name });
  }

  // --reuse targets the stack that was kept, whatever the current shell says.
  const saved = flags.has('--reuse') ? readEnvFile(ENV_FILE) : {};
  const pick = (savedKey, envKey, fallback) => saved[savedKey] ?? process.env[envKey] ?? fallback;
  const ports = {
    api: pick('E2E_API_PORT', 'E2E_API_PORT', '14000'),
    client: pick('E2E_CLIENT_PORT', 'E2E_CLIENT_PORT', '13000'),
    admin: pick('E2E_ADMIN_PORT', 'E2E_ADMIN_PORT', '13001'),
    rescue: pick('E2E_RESCUE_PORT', 'E2E_RESCUE_PORT', '13002'),
    limiter: pick('E2E_LIMITER_PORT', 'E2E_LIMITER_PORT', '14001'),
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
      env: stackEnv(),
      ...opts,
    }).status ?? 1;
  // Async variant for long calls (`up`), so the memory sampler keeps running.
  const composeAsync = (args, { profiles = allProfiles } = {}) =>
    new Promise(resolve => {
      const child = spawn('docker', [...composeBase, ...profiles, ...args], {
        cwd: ROOT,
        stdio: 'inherit',
        env: stackEnv(),
      });
      child.on('exit', status => resolve(status ?? 1));
      child.on('error', () => resolve(1));
    });
  const composeCapture = args =>
    capture('docker', [...composeBase, ...allProfiles, ...args], stackEnv());

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
  if (memTotalGiB > 0 && memTotalGiB < STACK_NEEDS_GIB) {
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

        // The services import the lib.* packages from their compiled dist/ and
        // the source tree is bind-mounted into the containers (nothing in the
        // shared dev image builds them), so build them once here on the host.
        // turbo caches reruns.
        log('building the lib.* packages on the host');
        const libs = spawnSync('pnpm', ['run', 'build:libs'], {
          cwd: ROOT,
          stdio: 'inherit',
          shell: process.platform === 'win32',
        });
        if (libs.status !== 0) throw new Error('pnpm build:libs failed');
        mark('libs');

        assertOnlyE2ePortsPublished();

        log(`booting ${PROJECT}`);
        if ((await composeAsync(['up', '-d', '--no-build'], { profiles: upProfiles })) !== 0) {
          throw new Error('docker compose up failed');
        }
        await waitForStack();
        await warmUpApps();
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

  // The overlay promises nothing is published beside the e2e ports (a Compose
  // that ignored a `ports` override once published the dev ports on a CI runner).
  // Check the merged model before starting anything.
  function assertOnlyE2ePortsPublished() {
    const allowed = new Set(Object.values(ports));
    const model = JSON.parse(composeCapture(['config', '--format', 'json']) || '{}');
    const unexpected = Object.entries(model.services ?? {}).flatMap(([name, service]) =>
      (service.ports ?? [])
        .map(port => String(port.published))
        .filter(published => !allowed.has(published))
        .map(published => `${name}:${published}`)
    );
    if (unexpected.length > 0) {
      throw new Error(
        `docker-compose.e2e.yml would publish ports outside the e2e set (${unexpected.join(', ')}); ` +
          `this Compose (${composeVersion}) may not honour the !override tag.`
      );
    }
  }

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
    let supervision = { unhealthySince: {}, restartedAt: {} };
    while (Date.now() < deadline) {
      const rows = psRows();
      supervision = superviseServices(rows, supervision, Date.now(), {
        log,
        restartService: service => compose(['restart', service]),
        tailLogs: (service, lines) =>
          composeCapture(['logs', '--no-color', `--tail=${lines}`, service]),
      });
      const waiting = notReady(rows);
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

  function psRows() {
    return composeCapture(['ps', '--all', '--format', 'json'])
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
  }

  // A service is ready when it is running and, if it has a healthcheck, healthy.
  // A container that exits, or stays unhealthy past the grace period, is
  // restarted once by superviseServices (the dev image's `tsx watch` keeps a
  // crashed container "Up", so Compose's restart policy cannot be relied on);
  // until it recovers it simply stays "not ready".
  function notReady(rows) {
    if (rows.length === 0) return ['(no containers yet)'];
    return rows
      .filter(row => row.State !== 'running' || (row.Health && row.Health !== 'healthy'))
      .map(row => row.Service);
  }

  // Vite dev servers compile on the first request; hit the login page of each
  // app so Playwright's global setup does not pay for the cold compile.
  async function warmUpApps() {
    log('warming up the Vite dev servers');
    // One at a time: each first request spikes to about 1 GB while Vite
    // optimises dependencies, and three at once dominate the stack's peak.
    for (const port of [ports.client, ports.admin, ports.rescue]) {
      try {
        await fetch(`http://localhost:${port}/login`, { signal: AbortSignal.timeout(120_000) });
      } catch {
        /* best effort: global setup waits for the apps anyway */
      }
    }
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
      env: stackEnv(),
      maxBuffer: 512 * 1024 * 1024,
    });
    if (full.stdout) writeFileSync(join(ROOT, 'docker-compose.log'), full.stdout);
  }

  process.on('SIGINT', () => {
    if (!keep && !flags.has('--reuse')) teardown();
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
