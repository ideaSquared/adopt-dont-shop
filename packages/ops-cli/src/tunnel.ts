import type { OpsEnv } from '@adopt-dont-shop/ops-contract';
import { checkHealth } from './client.js';
import { isInteractive, type Ctx } from './ctx.js';
import { ENDPOINTS, baseUrlFor } from './endpoints.js';
import { CliError, NetworkError, UsageError } from './errors.js';
import type { SshSettings } from './store.js';

export const expandHome = (path: string, home: string): string =>
  path === '~' ? home : path.startsWith('~/') ? `${home}/${path.slice(2)}` : path;

export const tunnelArgs = (env: OpsEnv, ssh: SshSettings, home: string): readonly string[] => {
  const { localPort, remotePort } = ENDPOINTS[env];
  return [
    '-N',
    '-o',
    'BatchMode=yes',
    '-o',
    'ExitOnForwardFailure=yes',
    '-o',
    'ServerAliveInterval=30',
    '-L',
    `${localPort}:127.0.0.1:${remotePort}`,
    ...(ssh.identityFile ? ['-i', expandHome(ssh.identityFile, home)] : []),
    `${ssh.user}@${ssh.host}`,
  ];
};

const READY_ATTEMPTS = 20;
const READY_INTERVAL_MS = 500;

const waitUntilReady = async (
  ctx: Ctx,
  env: OpsEnv,
  pid: number | undefined,
  attempt = 0
): Promise<boolean> => {
  if ((await checkHealth(ctx.fetch, baseUrlFor(env))).ok) {
    return true;
  }
  if (attempt >= READY_ATTEMPTS) {
    return false;
  }
  if (pid !== undefined && !ctx.isAlive(pid)) {
    return false;
  }
  await ctx.sleep(READY_INTERVAL_MS);
  return waitUntilReady(ctx, env, pid, attempt + 1);
};

// Opens the SSH tunnel for staging / prod unless /health/ready already answers.
export const ensureTunnel = async (ctx: Ctx, env: OpsEnv): Promise<void> => {
  if ((await checkHealth(ctx.fetch, baseUrlFor(env))).ok) {
    return;
  }
  const { ssh } = await ctx.store.readConfig();
  const settings = env === 'dev' ? undefined : ssh[env];
  if (!settings) {
    throw new UsageError(`No SSH settings for ${env} yet.`, 'Run `pnpm ops setup` to add them.');
  }
  const { pid } = ctx.spawnDetached('ssh', tunnelArgs(env, settings, ctx.homeDir));
  if (pid === undefined) {
    throw new CliError(
      'Could not start the ssh program.',
      1,
      'Is OpenSSH installed? Run `pnpm ops doctor`.'
    );
  }
  await ctx.store.writeTunnel(env, { pid, startedAt: new Date(ctx.now()).toISOString() });
  if (await waitUntilReady(ctx, env, pid)) {
    return;
  }
  await ctx.store.removeTunnel(env);
  ctx.kill(pid);
  throw new CliError(
    `The SSH tunnel to ${env} did not come up.`,
    1,
    `Try \`ssh ${settings.user}@${settings.host}\` once by hand to accept the host key, then \`pnpm ops doctor\`.`
  );
};

export type TunnelStatus = { readonly up: boolean; readonly pid?: number };

export const tunnelStatus = async (ctx: Ctx, env: OpsEnv): Promise<TunnelStatus> => {
  const record = await ctx.store.readTunnel(env);
  const up = (await checkHealth(ctx.fetch, baseUrlFor(env))).ok;
  return { up, pid: record && ctx.isAlive(record.pid) ? record.pid : undefined };
};

export const stopTunnel = async (ctx: Ctx, env: OpsEnv): Promise<boolean> => {
  const record = await ctx.store.readTunnel(env);
  await ctx.store.removeTunnel(env);
  return record ? ctx.kill(record.pid) : false;
};

// Reachability for any env: dev is direct, staging / prod go through the tunnel.
export const connect = async (ctx: Ctx, env: OpsEnv): Promise<string> => {
  const baseUrl = baseUrlFor(env);
  if ((await checkHealth(ctx.fetch, baseUrl)).ok) {
    return baseUrl;
  }
  if (!ENDPOINTS[env].tunnel) {
    throw new NetworkError(env);
  }
  const spinner = isInteractive(ctx) ? ctx.prompts.spinner() : undefined;
  spinner?.start(`Opening SSH tunnel to ${env}`);
  try {
    await ensureTunnel(ctx, env);
  } catch (e) {
    spinner?.stop(`Could not open the tunnel to ${env}`);
    throw e;
  }
  spinner?.stop(`Tunnel to ${env} is up`);
  return baseUrl;
};
