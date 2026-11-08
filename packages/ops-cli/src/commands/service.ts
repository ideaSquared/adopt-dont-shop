import type { OpsEnv } from '@adopt-dont-shop/ops-contract';
import { parseArgv, type Globals, type ParsedArgs } from '../args.js';
import { buildIndex, type CatalogIndex } from '../catalog.js';
import { loadCachedCatalog, loadCatalog } from '../catalog-loader.js';
import type { Client } from '../client.js';
import type { Ctx } from '../ctx.js';
import { buildRequest, fieldSpecs, optionsFor } from '../flags.js';
import { runInvocation } from '../invoke.js';
import type { Out } from '../out.js';
import { argvForHistory, resolveMethod, resolveService } from '../resolve.js';
import { withServer } from '../server.js';
import { renderMethodHelp, renderServiceList } from '../ui/render.js';

// `pnpm ops <service> [command] [args]`: list, help, or run.
export const runService = async (
  ctx: Ctx,
  env: OpsEnv,
  argv: readonly string[],
  parsed: ParsedArgs,
  globals: Globals,
  out: Out
): Promise<number> => {
  const [serviceName = '', commandName] = parsed.positionals;
  const helpMode = commandName === undefined || globals.help;

  const showHelp = (index: CatalogIndex): number => {
    const service = resolveService(index, serviceName);
    out.body(
      commandName === undefined
        ? renderServiceList(ctx.theme, service, ctx.columns)
        : renderMethodHelp(ctx.theme, index, service, resolveMethod(service, commandName))
    );
    return 0;
  };

  const run = (index: CatalogIndex, client: Client): Promise<number> => {
    const service = resolveService(index, serviceName);
    const method = resolveMethod(service, commandName ?? '');
    const specs = fieldSpecs(index, method);
    const withFlags = parseArgv(argv, optionsFor(specs));
    const request = buildRequest({
      specs,
      parsed: withFlags,
      positionals: withFlags.positionals.slice(2),
      json: globals.json,
    });
    return runInvocation(
      ctx,
      client,
      {
        env,
        index,
        service,
        method,
        specs,
        request,
        globals,
        historyArgv: argvForHistory(argv),
      },
      out
    );
  };

  if (helpMode && !globals.refresh) {
    const cached = await loadCachedCatalog(ctx, env);
    if (cached) {
      return showHelp(buildIndex(cached));
    }
  }
  return withServer(ctx, env, async client => {
    const index = buildIndex(await loadCatalog(ctx, env, client, globals.refresh));
    return helpMode ? showHelp(index) : run(index, client);
  });
};
