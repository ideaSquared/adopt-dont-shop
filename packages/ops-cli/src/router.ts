import { parseArgv, readGlobals, GLOBAL_OPTIONS } from './args.js';
import { buildIndex } from './catalog.js';
import { loadCachedCatalog, loadCatalog } from './catalog-loader.js';
import { runInteractive } from './interactive.js';
import { isInteractive, type Ctx } from './ctx.js';
import { ApiError, CancelledError, CliError } from './errors.js';
import { resolveEnv } from './env.js';
import { createOut } from './out.js';
import { runDoctor } from './commands/doctor.js';
import { complete, completionScript } from './commands/completion.js';
import {
  runHistory,
  runLock,
  runLogin,
  runLogout,
  runTunnel,
  runUnlock,
  runUse,
  runWhoami,
} from './commands/basic.js';
import { runService } from './commands/service.js';
import { runSetup } from './commands/setup.js';
import { renderErrorBox, renderHeader, renderOverallHelp } from './ui/render.js';
import { withServer } from './server.js';
import { parseArgs } from 'node:util';

const UNLOCK_OPTIONS = {
  reason: { type: 'string' },
  ticket: { type: 'string' },
  ttl: { type: 'string' },
} as const;

export const reportError = (e: unknown, ctx: Ctx): number => {
  if (e instanceof CancelledError) {
    return 1;
  }
  if (e instanceof CliError) {
    ctx.err(
      `${renderErrorBox(ctx.theme, {
        code: e instanceof ApiError ? e.code : undefined,
        message: e.message,
        hint: e.hint,
      }).join('\n')}\n`
    );
    return e.exitCode;
  }
  const message = e instanceof Error ? e.message : String(e);
  ctx.err(`${renderErrorBox(ctx.theme, { message: `Unexpected error: ${message}` }).join('\n')}\n`);
  return 1;
};

export const main = async (argv: readonly string[], ctx: Ctx): Promise<number> => {
  try {
    return await dispatch(argv, ctx);
  } catch (e) {
    return reportError(e, ctx);
  }
};

const completeWords = async (argv: readonly string[], ctx: Ctx): Promise<number> => {
  const words = argv.slice(argv.indexOf('__complete') + 1);
  const config = await ctx.store.readConfig().catch(() => undefined);
  const flagEnv = words.findIndex(w => w === '-e' || w === '--env');
  const env = resolveEnv({
    flag: flagEnv >= 0 ? words[flagEnv + 1] : undefined,
    envVar: ctx.env.ADS_OPS_ENV,
    saved: config?.currentEnv,
  });
  const catalog = await loadCachedCatalog(ctx, env);
  const candidates = complete(words, catalog ? buildIndex(catalog) : undefined);
  if (candidates.length > 0) {
    ctx.out(`${candidates.join('\n')}\n`);
  }
  return 0;
};

const dispatch = async (argv: readonly string[], ctx: Ctx): Promise<number> => {
  const parsed = parseArgv(argv);
  const [word] = parsed.positionals;
  if (word === '__complete') {
    return completeWords(argv, ctx);
  }
  const globals = readGlobals(parsed.values);
  const interactive = isInteractive(ctx);

  if (globals.version) {
    ctx.out(`ads-ops ${ctx.version}\n`);
    return 0;
  }
  if (word === 'completion') {
    ctx.out(completionScript(parsed.positionals[1] ?? '', ctx.repoRoot));
    return 0;
  }
  if (word === 'help' && parsed.positionals.length > 1) {
    return main([...parsed.positionals.slice(1), '--help'], ctx);
  }
  if (word === 'help' || (word === undefined && (globals.help || !interactive))) {
    ctx.out(`${renderOverallHelp(ctx.theme).join('\n')}\n`);
    return 0;
  }

  const config = await ctx.store.readConfig();
  const env = resolveEnv({
    flag: globals.env,
    envVar: ctx.env.ADS_OPS_ENV,
    saved: config.currentEnv,
  });
  const out = createOut(ctx, globals.output);
  if (word === 'setup') {
    return runSetup(ctx);
  }
  if (word === 'use') {
    return runUse(ctx, parsed.positionals[1], out);
  }
  if (word === 'again') {
    return runAgain(ctx, out);
  }

  out.chrome(renderHeader(ctx.theme, env));
  if (word === undefined) {
    return runBrowse(ctx, env, globals.refresh, out);
  }
  if (word === 'login') {
    return runLogin(ctx, env, out);
  }
  if (word === 'logout') {
    return runLogout(ctx, env, out);
  }
  if (word === 'whoami') {
    return runWhoami(ctx, env, out);
  }
  if (word === 'history') {
    return runHistory(ctx, env, parsed, out);
  }
  if (word === 'doctor') {
    return runDoctor(ctx, env, out);
  }
  if (word === 'lock') {
    return runLock(ctx, env, out);
  }
  if (word === 'tunnel') {
    return runTunnel(ctx, env, parsed.positionals.slice(1), out);
  }
  if (word === 'unlock') {
    const extra = parseArgs({
      args: [...argv],
      options: { ...UNLOCK_OPTIONS, ...GLOBAL_OPTIONS },
      allowPositionals: true,
      strict: false,
    }).values;
    const text = (v: unknown) => (typeof v === 'string' ? v : undefined);
    return runUnlock(
      ctx,
      env,
      parsed,
      { reason: text(extra.reason), ticket: text(extra.ticket), ttl: text(extra.ttl) },
      out
    );
  }
  return runService(ctx, env, argv, parsed, globals, out);
};

const runBrowse = (
  ctx: Ctx,
  env: Parameters<typeof withServer>[1],
  refresh: boolean,
  out: ReturnType<typeof createOut>
) =>
  withServer(ctx, env, async client => {
    const index = buildIndex(await loadCatalog(ctx, env, client, refresh));
    return runInteractive(ctx, env, client, index, out);
  });

const runAgain = async (ctx: Ctx, out: ReturnType<typeof createOut>): Promise<number> => {
  const history = await ctx.store.readHistory();
  const last = history[history.length - 1];
  if (!last) {
    throw new CliError(
      'Nothing to repeat yet.',
      1,
      'Run a command first, then `pnpm ops again` replays it.'
    );
  }
  out.chrome([`  ${ctx.theme.dim(`Re-running: pnpm ops ${last.argv.join(' ')}`)}`]);
  return main(['--env', last.env, ...last.argv], ctx);
};
