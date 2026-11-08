import type { LoginStartResponse, OpsEnv, Session } from '@adopt-dont-shop/ops-contract';
import { createClient, type Client } from './client.js';
import { isInteractive, type Ctx } from './ctx.js';
import { ApiError, CliError } from './errors.js';

// A login the dev server accepts: letters, digits, hyphens, max 39 chars.
export const sanitizeLogin = (name: string): string =>
  name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 39);

export const validateLogin = (value: string): string | undefined =>
  /^[A-Za-z0-9-]{1,39}$/.test(value) ? undefined : 'Use letters, digits and hyphens (max 39).';

const loginDev = async (ctx: Ctx, client: Client): Promise<Session> => {
  const config = await ctx.store.readConfig();
  const suggested = sanitizeLogin(await ctx.defaultLogin());
  const login =
    config.devLogin ??
    (isInteractive(ctx)
      ? (
          await ctx.prompts.text({
            message: 'What name should dev know you by?',
            initialValue: suggested,
            validate: validateLogin,
          })
        ).trim()
      : suggested);
  if (validateLogin(login)) {
    throw new CliError(
      'Could not work out a login name for dev.',
      1,
      'Run `pnpm ops login` in a terminal.'
    );
  }
  const { session } = await client.loginLocal(login);
  await ctx.store.updateConfig(c => ({ ...c, devLogin: login }));
  return session;
};

export type PollDeps = {
  readonly client: Client;
  readonly start: LoginStartResponse;
  readonly now: () => number;
  readonly sleep: (ms: number) => Promise<void>;
  readonly onWait?: (secondsLeft: number) => void;
};

// Polls until GitHub says ok / denied / expired, honouring interval and slow_down.
export const pollForSession = async (deps: PollDeps): Promise<Session> => {
  const deadline = deps.now() + deps.start.expiresIn * 1000;
  const step = async (intervalSeconds: number): Promise<Session> => {
    if (deps.now() >= deadline) {
      throw expired();
    }
    deps.onWait?.(Math.max(Math.round((deadline - deps.now()) / 1000), 0));
    await deps.sleep(intervalSeconds * 1000);
    const result = await deps.client.loginPoll(deps.start.deviceCode);
    if (result.status === 'ok') {
      return result.session;
    }
    if (result.status === 'expired') {
      throw expired();
    }
    if (result.status === 'denied') {
      throw new CliError(
        `GitHub signed you in, but ${result.reason}`,
        1,
        'Ask a maintainer to add you to the ops team for this environment.'
      );
    }
    return step(result.status === 'slow_down' ? result.interval : intervalSeconds);
  };
  return step(deps.start.interval);
};

const expired = () =>
  new CliError(
    'The login code expired before it was used.',
    1,
    'Run `pnpm ops login` to get a fresh one.'
  );

const countdown = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const loginDeviceFlow = async (ctx: Ctx, client: Client): Promise<Session> => {
  const start = await client.loginStart();
  const copied = await ctx.copyToClipboard(start.userCode).catch(() => false);
  await ctx.openUrl(start.verificationUri).catch(() => undefined);
  const { theme } = ctx;
  ctx.out(
    `${['', '  Open this page and enter the code:', `  ${theme.brand(start.verificationUri)}`, '', ...theme.codeBlock(start.userCode).map(l => `  ${l}`), '', copied ? `  ${theme.dim('Code copied to your clipboard.')}` : '', ''].join('\n')}\n`
  );
  const spinner = ctx.prompts.spinner();
  spinner.start('Waiting for you to authorise in the browser');
  const session = await pollForSession({
    client,
    start,
    now: ctx.now,
    sleep: ctx.sleep,
    onWait: left =>
      spinner.message(`Waiting for you to authorise in the browser (${countdown(left)} left)`),
  }).catch((e: unknown) => {
    spinner.stop('Login did not complete');
    throw e;
  });
  spinner.stop('Authorised on GitHub');
  return session;
};

export const performLogin = async (ctx: Ctx, env: OpsEnv, base: Client): Promise<Session> => {
  const session = env === 'dev' ? await loginDev(ctx, base) : await loginDeviceFlow(ctx, base);
  await ctx.store.saveSession(env, session);
  return session;
};

const SKEW_MS = 30_000;

export const isUsable = (session: Session, nowMs: number): boolean =>
  Date.parse(session.expiresAt) - SKEW_MS > nowMs;

// A valid stored session, or (in a terminal) a fresh login.
export const ensureSession = async (ctx: Ctx, env: OpsEnv, base: Client): Promise<Session> => {
  const stored = await ctx.store.getSession(env);
  if (stored && isUsable(stored, ctx.now())) {
    return stored;
  }
  if (!isInteractive(ctx)) {
    throw new CliError(
      `You are not signed in to ${env}.`,
      1,
      'Run `pnpm ops login` in a terminal first.'
    );
  }
  ctx.prompts.log.info(
    stored
      ? `Your ${env} session expired. Signing you in again.`
      : `You are not signed in to ${env}. Let's fix that.`
  );
  return performLogin(ctx, env, base);
};

// Runs `fn` with an authenticated client; re-logs-in once if the server revokes the session.
export const withAuth = async <T>(
  ctx: Ctx,
  env: OpsEnv,
  baseUrl: string,
  fn: (client: Client) => Promise<T>
): Promise<T> => {
  const base = createClient({ fetch: ctx.fetch, baseUrl, env });
  const session = await ensureSession(ctx, env, base);
  try {
    return await fn(base.withToken(session.token));
  } catch (e) {
    if (!(e instanceof ApiError) || e.code !== 'UNAUTHENTICATED' || !isInteractive(ctx)) {
      throw e;
    }
    await ctx.store.clearSession(env);
    ctx.prompts.log.warn(`The ${env} server no longer accepts your session. Signing you in again.`);
    const fresh = await performLogin(ctx, env, base);
    return fn(base.withToken(fresh.token));
  }
};
