import type { OpsEnv } from '@adopt-dont-shop/ops-contract';
import { checkHealth, createClient } from '../client.js';
import { loadCatalog } from '../catalog-loader.js';
import type { Ctx } from '../ctx.js';
import { ENDPOINTS, baseUrlFor } from '../endpoints.js';
import { CliError } from '../errors.js';
import { isUsable } from '../login.js';
import type { Out } from '../out.js';
import { ensureTunnel } from '../tunnel.js';
import { renderCheckSummary, renderChecks, type Check } from '../ui/render.js';

const SKEW_WARN_MS = 30_000;

export const clockSkewCheck = (serverDate: string | undefined, nowMs: number): Check => {
  const server = serverDate ? Date.parse(serverDate) : Number.NaN;
  if (Number.isNaN(server)) {
    return { name: 'Clock', status: 'skip', detail: 'the server sent no Date header' };
  }
  const skew = nowMs - server;
  const seconds = Math.round(Math.abs(skew) / 1000);
  if (Math.abs(skew) <= SKEW_WARN_MS) {
    return { name: 'Clock', status: 'ok', detail: `within ${Math.max(seconds, 1)}s of the server` };
  }
  return {
    name: 'Clock',
    status: 'warn',
    detail: `your clock is ${seconds}s ${skew > 0 ? 'ahead of' : 'behind'} the server; sessions may look expired`,
  };
};

const describe = (e: unknown): string =>
  e instanceof CliError
    ? [e.message, e.hint].filter(Boolean).join(' ')
    : e instanceof Error
      ? e.message
      : 'unknown error';

const attempt = async (name: string, run: () => Promise<string>): Promise<Check> => {
  try {
    return { name, status: 'ok', detail: await run() };
  } catch (e) {
    return { name, status: 'fail', detail: describe(e) };
  }
};

const localChecks = async (ctx: Ctx, env: OpsEnv): Promise<readonly Check[]> => {
  const remote = ENDPOINTS[env].tunnel;
  const config = await attempt('Config', async () => {
    const exists = await ctx.store.configExists();
    await ctx.store.readConfig();
    return exists
      ? ctx.store.paths.config
      : 'no config file yet (fine for dev; run `pnpm ops setup` for staging / prod)';
  });
  if (!remote) {
    return [config];
  }
  const ssh = await ctx.exec('ssh', ['-V']);
  const settings = (await ctx.store.readConfig().catch(() => undefined))?.ssh[
    env as 'staging' | 'prod'
  ];
  return [
    config,
    ssh.code === 0
      ? {
          name: 'ssh',
          status: 'ok',
          detail: (ssh.stderr || ssh.stdout).trim().split('\n')[0] ?? 'installed',
        }
      : { name: 'ssh', status: 'fail', detail: 'the ssh program was not found; install OpenSSH' },
    settings
      ? { name: 'SSH settings', status: 'ok', detail: `${settings.user}@${settings.host}` }
      : { name: 'SSH settings', status: 'fail', detail: `none for ${env}; run \`pnpm ops setup\`` },
  ];
};

export const runDoctor = async (ctx: Ctx, env: OpsEnv, out: Out): Promise<number> => {
  const remote = ENDPOINTS[env].tunnel;
  const local = await localChecks(ctx, env);
  const baseUrl = baseUrlFor(env);
  const tunnelCheck: readonly Check[] = remote
    ? [
        await attempt(
          'Tunnel',
          async () => (await ensureTunnel(ctx, env), `up on port ${ENDPOINTS[env].localPort}`)
        ),
      ]
    : [];
  const health = await checkHealth(ctx.fetch, baseUrl);
  const healthCheck: Check = health.ok
    ? { name: 'Server', status: 'ok', detail: `${baseUrl}/health/ready` }
    : {
        name: 'Server',
        status: 'fail',
        detail: `no answer from ${baseUrl}${env === 'dev' ? '; is `pnpm docker:dev` running?' : ''}`,
      };
  const needsServer = (name: string): Check => ({
    name,
    status: 'skip',
    detail: 'needs the server',
  });
  const rest: readonly Check[] = health.ok
    ? await serverChecks(ctx, env, baseUrl, health.serverDate)
    : [needsServer('Session'), needsServer('Catalog'), needsServer('Clock')];
  const checks = [...local, ...tunnelCheck, healthCheck, ...rest];
  out.body([...renderChecks(ctx.theme, checks), '', ...renderCheckSummary(ctx.theme, checks)]);
  return checks.some(c => c.status === 'fail') ? 1 : 0;
};

const serverChecks = async (
  ctx: Ctx,
  env: OpsEnv,
  baseUrl: string,
  serverDate: string | undefined
): Promise<readonly Check[]> => {
  const base = createClient({ fetch: ctx.fetch, baseUrl, env });
  const stored = await ctx.store.getSession(env);
  const client = stored && isUsable(stored, ctx.now()) ? base.withToken(stored.token) : undefined;
  const session: Check = client
    ? await attempt('Session', async () => `signed in as ${(await client.whoami()).operator.login}`)
    : {
        name: 'Session',
        status: 'fail',
        detail: stored ? 'expired; run `pnpm ops login`' : 'not signed in; run `pnpm ops login`',
      };
  const catalog: Check = client
    ? await attempt('Catalog', async () => {
        const c = await loadCatalog(ctx, env, client, true);
        return `${c.services.length} services, ${c.services.reduce((n, s) => n + s.methods.length, 0)} commands`;
      })
    : { name: 'Catalog', status: 'skip', detail: 'needs a session' };
  return [session, catalog, clockSkewCheck(serverDate, ctx.now())];
};
