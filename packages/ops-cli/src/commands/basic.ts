import { OpsEnvSchema, type OpsEnv, type SubjectType } from '@adopt-dont-shop/ops-contract';
import type { ParsedArgs } from '../args.js';
import { checkHealth, createClient } from '../client.js';
import { isInteractive, type Ctx } from '../ctx.js';
import { ENDPOINTS, baseUrlFor } from '../endpoints.js';
import { UsageError } from '../errors.js';
import { didYouMean } from '../catalog.js';
import { performLogin } from '../login.js';
import type { Out } from '../out.js';
import { withServer } from '../server.js';
import { stopTunnel, tunnelStatus, connect } from '../tunnel.js';
import { buildEnumShortNames, formatTimestamp } from '../ui/format.js';
import {
  renderHeader,
  renderHistory,
  renderSuccess,
  renderUnlockLine,
  renderWarning,
  renderWhoami,
} from '../ui/render.js';
import { SUBJECT_TYPES, createUnlockFlow, renderUnlockCreated } from '../unlock.js';

export const runUse = async (ctx: Ctx, target: string | undefined, out: Out): Promise<number> => {
  const chosen =
    target ??
    (isInteractive(ctx)
      ? await ctx.prompts.select({
          message: 'Switch to which environment?',
          options: OpsEnvSchema.options.map(e => ({ value: e, label: e })),
          initialValue: (await ctx.store.readConfig()).currentEnv,
        })
      : undefined);
  if (!chosen) {
    throw new UsageError('Which environment?', 'Usage: pnpm ops use <dev|staging|prod>');
  }
  const parsed = OpsEnvSchema.safeParse(chosen);
  if (!parsed.success) {
    throw new UsageError(
      `Unknown environment "${chosen}".`,
      [didYouMean(chosen, OpsEnvSchema.options, 'pnpm ops use '), 'Use one of: dev, staging, prod.']
        .filter(Boolean)
        .join(' ')
    );
  }
  await ctx.store.updateConfig(c => ({ ...c, currentEnv: parsed.data }));
  out.body([
    ...renderHeader(ctx.theme, parsed.data),
    ...renderSuccess(ctx.theme, `Now using ${parsed.data}`),
    ...(parsed.data === 'prod'
      ? renderWarning(ctx.theme, 'Writes in prod need you to type `prod` to confirm.')
      : []),
  ]);
  return 0;
};

export const runLogin = async (ctx: Ctx, env: OpsEnv, out: Out): Promise<number> => {
  const baseUrl = await connect(ctx, env);
  const session = await performLogin(ctx, env, createClient({ fetch: ctx.fetch, baseUrl, env }));
  out.body([
    ...renderSuccess(ctx.theme, `Signed in to ${env} as ${session.operator.login}`),
    `  ${ctx.theme.dim(`Session expires ${formatTimestamp(session.expiresAt, ctx.timeZone)}`)}`,
    '',
    `  ${ctx.theme.dim('Try:')} pnpm ops`,
  ]);
  return 0;
};

export const runLogout = async (ctx: Ctx, env: OpsEnv, out: Out): Promise<number> => {
  const session = await ctx.store.getSession(env);
  if (!session) {
    out.body(renderWarning(ctx.theme, `You were not signed in to ${env}.`));
    return 0;
  }
  // Revoke server-side when reachable; never open a tunnel just to sign out.
  const reachable = (await checkHealth(ctx.fetch, baseUrlFor(env), 1500)).ok;
  if (reachable) {
    await createClient({ fetch: ctx.fetch, baseUrl: baseUrlFor(env), env, token: session.token })
      .logout()
      .catch(() => undefined);
  }
  await ctx.store.clearSession(env);
  out.body(renderSuccess(ctx.theme, `Signed out of ${env}`));
  if (!reachable) {
    out.body(
      renderWarning(
        ctx.theme,
        'The server was not reachable, so the session was only forgotten locally.'
      )
    );
  }
  return 0;
};

export const runWhoami = (ctx: Ctx, env: OpsEnv, out: Out): Promise<number> =>
  withServer(ctx, env, async client => {
    const who = await client.whoami();
    if (out.json) {
      return out.raw(who);
    }
    out.body(renderWhoami(ctx.theme, who, ctx.now(), ctx.timeZone));
    return 0;
  });

export const runHistory = (ctx: Ctx, env: OpsEnv, parsed: ParsedArgs, out: Out): Promise<number> =>
  withServer(ctx, env, async client => {
    const limit = Number(parsed.positionals[1] ?? 20);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new UsageError('History takes a number from 1 to 100.', 'Example: pnpm ops history 50');
    }
    const { entries } = await client.history(limit);
    if (out.json) {
      return out.raw(entries);
    }
    out.body(
      renderHistory(entries, {
        theme: ctx.theme,
        enums: buildEnumShortNames({ env, services: [], messages: {}, enums: {} }),
        columns: ctx.columns,
        timeZone: ctx.timeZone,
      })
    );
    return 0;
  });

export const parseSubject = (
  words: readonly string[]
): { subjectType: SubjectType; subjectId: string | null } => {
  const [type, id] = words;
  const subjectType = SUBJECT_TYPES.find(t => t === type);
  if (!subjectType) {
    throw new UsageError(
      type ? `Unknown unlock subject "${type}".` : 'What do you want to unlock?',
      'Usage: pnpm ops unlock <user|rescue|application> <id>   or   pnpm ops unlock any'
    );
  }
  if (subjectType === 'any') {
    return { subjectType, subjectId: null };
  }
  if (!id) {
    throw new UsageError(`Which ${subjectType}?`, `Usage: pnpm ops unlock ${subjectType} <id>`);
  }
  return { subjectType, subjectId: id };
};

export const runUnlock = (
  ctx: Ctx,
  env: OpsEnv,
  parsed: ParsedArgs,
  extra: { reason?: string; ticket?: string; ttl?: string },
  out: Out
): Promise<number> => {
  const subject = parseSubject(parsed.positionals.slice(1));
  return withServer(ctx, env, async client => {
    const unlock = await createUnlockFlow(
      ctx,
      env,
      client,
      { subject, ...extra },
      isInteractive(ctx) && !out.json
    );
    if (out.json) {
      return out.raw(unlock);
    }
    out.body(['', ...renderUnlockCreated(ctx, env, unlock)]);
    return 0;
  });
};

export const runLock = (ctx: Ctx, env: OpsEnv, out: Out): Promise<number> =>
  withServer(ctx, env, async client => {
    const { unlocks } = await client.listUnlocks();
    await client.revokeUnlocks();
    out.body(
      unlocks.length === 0
        ? renderWarning(ctx.theme, 'You had no active unlocks.')
        : [
            ...renderSuccess(
              ctx.theme,
              `Locked again (${unlocks.length} unlock${unlocks.length === 1 ? '' : 's'} revoked)`
            ),
            ...unlocks.map(u => renderUnlockLine(ctx.theme, u, ctx.now(), ctx.timeZone)),
          ]
    );
    return 0;
  });

export const runTunnel = async (
  ctx: Ctx,
  env: OpsEnv,
  words: readonly string[],
  out: Out
): Promise<number> => {
  const [action, target] = words;
  const remote = OpsEnvSchema.options.filter(e => ENDPOINTS[e].tunnel);
  if (action === 'status') {
    const rows = await Promise.all(remote.map(async e => ({ e, s: await tunnelStatus(ctx, e) })));
    out.body(
      rows.map(
        ({ e, s }) =>
          `  ${s.up ? ctx.theme.ok(ctx.theme.sym.ok) : ctx.theme.dim('-')} ${e.padEnd(8)} ${s.up ? `up on port ${ENDPOINTS[e].localPort}${s.pid ? ctx.theme.dim(` (pid ${s.pid})`) : ''}` : ctx.theme.dim('down')}`
      )
    );
    return 0;
  }
  if (action === 'stop') {
    const targets = target === 'all' ? remote : [env];
    const stopped = await Promise.all(
      targets.map(async e => ({ e, ok: await stopTunnel(ctx, e) }))
    );
    out.body(
      stopped.map(({ e, ok }) =>
        ok
          ? `  ${ctx.theme.ok(ctx.theme.sym.ok)} Stopped the ${e} tunnel`
          : `  ${ctx.theme.dim(`No ${e} tunnel was running`)}`
      )
    );
    return 0;
  }
  throw new UsageError('Usage: pnpm ops tunnel <status|stop [all]>');
};
