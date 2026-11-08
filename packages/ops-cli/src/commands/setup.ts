import type { OpsEnv } from '@adopt-dont-shop/ops-contract';
import { checkHealth } from '../client.js';
import type { Ctx } from '../ctx.js';
import { CliError } from '../errors.js';
import { baseUrlFor } from '../endpoints.js';
import type { Config, SshSettings } from '../store.js';
import { ensureTunnel, expandHome, stopTunnel } from '../tunnel.js';

export const validateHost = (value: string): string | undefined =>
  /^[A-Za-z0-9._:-]+$/.test(value.trim())
    ? undefined
    : 'Enter a host name or IP address, no spaces.';

export const validateUser = (value: string): string | undefined =>
  /^[A-Za-z0-9._-]+$/.test(value.trim()) ? undefined : 'Enter the SSH user name, no spaces.';

const REMOTE_ENVS: readonly Exclude<OpsEnv, 'dev'>[] = ['staging', 'prod'];

// Opens the tunnel just long enough to prove the settings work.
const testTunnel = async (ctx: Ctx, env: OpsEnv): Promise<string | undefined> => {
  const alreadyUp = (await checkHealth(ctx.fetch, baseUrlFor(env))).ok;
  try {
    await ensureTunnel(ctx, env);
    return undefined;
  } catch (e) {
    if (e instanceof CliError) {
      return [e.message, e.hint].filter(Boolean).join(' ');
    }
    return e instanceof Error ? e.message : 'Unknown error.';
  } finally {
    if (!alreadyUp) {
      await stopTunnel(ctx, env);
    }
  }
};

const askSsh = async (
  ctx: Ctx,
  env: OpsEnv,
  current: SshSettings | undefined
): Promise<SshSettings> => {
  const { prompts } = ctx;
  const host = (
    await prompts.text({
      message: `SSH host for ${env}`,
      placeholder: 'ops.example.com',
      initialValue: current?.host,
      validate: validateHost,
    })
  ).trim();
  const user = (
    await prompts.text({
      message: `SSH user for ${env}`,
      placeholder: 'ads-ops',
      initialValue: current?.user,
      validate: validateUser,
    })
  ).trim();
  const identity = (
    await prompts.text({
      message: 'Identity file (empty to use your default key or ssh-agent)',
      placeholder: '~/.ssh/id_ed25519',
      initialValue: current?.identityFile,
    })
  ).trim();
  if (identity && !(await ctx.fileExists(expandHome(identity, ctx.homeDir)))) {
    prompts.log.warn(`${identity} does not exist yet. Saving it anyway.`);
  }
  return { host, user, ...(identity ? { identityFile: identity } : {}) };
};

const setUpRemote = async (ctx: Ctx, env: Exclude<OpsEnv, 'dev'>): Promise<void> => {
  const { prompts } = ctx;
  const before = (await ctx.store.readConfig()).ssh[env];
  const wanted = await prompts.confirm({
    message: `Set up ${env} access?`,
    initialValue: before !== undefined,
  });
  if (!wanted) {
    return;
  }
  const settings = await askSsh(ctx, env, before);
  await ctx.store.updateConfig((c: Config) => ({ ...c, ssh: { ...c.ssh, [env]: settings } }));
  const spinner = prompts.spinner();
  spinner.start(`Opening the tunnel to ${env} and checking it`);
  const problem = await testTunnel(ctx, env);
  if (!problem) {
    return spinner.stop(`${env} works: tunnel is up and the server is ready`);
  }
  spinner.stop(`Could not reach ${env}`);
  prompts.log.error(problem);
  const keep = await prompts.confirm({
    message: 'Keep these settings anyway?',
    initialValue: false,
  });
  if (keep) {
    return;
  }
  await ctx.store.updateConfig((c: Config) => ({ ...c, ssh: { ...c.ssh, [env]: before } }));
};

export const runSetup = async (ctx: Ctx): Promise<number> => {
  const { prompts, theme } = ctx;
  prompts.intro(theme.heading(' ads-ops setup '));
  prompts.note(
    [
      'dev      nothing to configure - it talks to your local stack.',
      'staging  reached through an SSH tunnel (ask a maintainer for host and user).',
      'prod     same, with extra friction on purpose.',
      '',
      'You can skip staging and prod now and run this again later.',
    ].join('\n'),
    'How it works'
  );
  await REMOTE_ENVS.reduce(async (prev, env) => {
    await prev;
    await setUpRemote(ctx, env);
  }, Promise.resolve());
  const config = await ctx.store.readConfig();
  await ctx.store.writeConfig(config);
  const configured = REMOTE_ENVS.filter(e => config.ssh[e]);
  prompts.log.success(`Saved to ${ctx.store.paths.config}`);
  prompts.outro(
    configured.length > 0
      ? `All set. Next: ${theme.bold('pnpm ops login')}   ${theme.dim(`(then pnpm ops use ${configured[0]} to switch)`)}`
      : `All set. Start the stack with ${theme.bold('pnpm docker:dev')}, then run ${theme.bold('pnpm ops login')}`
  );
  return 0;
};
