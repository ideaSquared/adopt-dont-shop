import type {
  CatalogMethod,
  CatalogService,
  InvokePlan,
  InvokeResult,
  OpsEnv,
  Unlockable,
} from '@adopt-dont-shop/ops-contract';
import type { Globals } from './args.js';
import type { CatalogIndex } from './catalog.js';
import type { Client } from './client.js';
import { isInteractive, type Ctx } from './ctx.js';
import { ApiError } from './errors.js';
import type { FieldSpec } from './flags.js';
import type { Out } from './out.js';
import { findRows, type FormatContext } from './ui/format.js';
import {
  renderBody,
  renderFooter,
  renderHiddenNotice,
  renderPlan,
  renderProdBanner,
  renderSuccess,
  renderWarning,
  type Lines,
} from './ui/render.js';
import {
  createUnlockFlow,
  hiddenOfferText,
  lookupOfferText,
  promptSubject,
  renderUnlockCreated,
  shouldOfferUnlockBefore,
} from './unlock.js';
import {
  PROD_CONFIRMATION,
  decideWrite,
  assertYesAllowed,
  validateProdConfirmation,
} from './write-flow.js';

export type Invocation = {
  readonly env: OpsEnv;
  readonly index: CatalogIndex;
  readonly service: CatalogService;
  readonly method: CatalogMethod;
  readonly specs: readonly FieldSpec[];
  readonly request: Readonly<Record<string, unknown>>;
  readonly globals: Pick<Globals, 'yes' | 'output'>;
  readonly historyArgv: readonly string[];
};

type Options = { readonly skipUnlockOffer?: boolean };

const fmt = (ctx: Ctx, inv: Invocation): FormatContext => ({
  theme: ctx.theme,
  enums: inv.index.enums,
  columns: ctx.columns,
  timeZone: ctx.timeZone,
});

const unlockAndAnnounce = async (
  ctx: Ctx,
  inv: Invocation,
  client: Client,
  out: Out,
  subject: Unlockable
): Promise<void> => {
  const unlock = await createUnlockFlow(ctx, inv.env, client, { subject }, true);
  out.chrome(renderUnlockCreated(ctx, inv.env, unlock));
};

const offerBeforeCalling = async (ctx: Ctx, inv: Invocation, client: Client, out: Out) => {
  const { unlocks } = await client.listUnlocks().catch(() => ({ unlocks: [] }));
  const fields = shouldOfferUnlockBefore({
    method: inv.method,
    request: inv.request,
    unlocks,
    nowMs: ctx.now(),
    interactive: true,
  });
  if (fields.length === 0) {
    return;
  }
  if (!(await ctx.prompts.confirm({ message: lookupOfferText(fields), initialValue: true }))) {
    return;
  }
  await unlockAndAnnounce(ctx, inv, client, out, await promptSubject(ctx));
};

// Calls the server; if it says UNLOCK_REQUIRED and we can ask, offers an unlock and retries once.
const callWithUnlockRetry = async <T>(
  ctx: Ctx,
  inv: Invocation,
  client: Client,
  out: Out,
  interactive: boolean,
  call: () => Promise<T>
): Promise<T> => {
  try {
    return await call();
  } catch (e) {
    if (!(e instanceof ApiError) || e.code !== 'UNLOCK_REQUIRED' || !interactive) {
      throw e;
    }
    ctx.prompts.log.warn(e.message);
    if (
      !(await ctx.prompts.confirm({
        message: 'Unlock to continue? Needs a reason + ticket and alerts #ops.',
        initialValue: true,
      }))
    ) {
      throw e;
    }
    await unlockAndAnnounce(ctx, inv, client, out, await promptSubject(ctx));
    return call();
  }
};

const resultLines = (ctx: Ctx, inv: Invocation, out: Out, result: InvokeResult): Lines => {
  const f = fmt(ctx, inv);
  const rows = out.mode === 'table' ? findRows(result.response) : undefined;
  return [
    ...renderBody(result.response, f, rows),
    ...(result.hidden.length > 0 ? renderHiddenNotice(ctx.theme, result.hidden) : []),
    ...renderFooter(ctx.theme, result.durationMs),
  ];
};

const recordHistory = (ctx: Ctx, inv: Invocation) =>
  ctx.store
    .appendHistory({
      at: new Date(ctx.now()).toISOString(),
      env: inv.env,
      argv: [...inv.historyArgv],
    })
    .catch(() => undefined);

const offerAfterHidden = async (
  ctx: Ctx,
  inv: Invocation,
  client: Client,
  out: Out,
  result: InvokeResult
): Promise<number | undefined> => {
  if (result.hidden.length === 0 || !result.unlockable) {
    return undefined;
  }
  const ok = await ctx.prompts.confirm({
    message: hiddenOfferText(result.hidden.length, result.unlockable),
    initialValue: false,
  });
  if (!ok) {
    return undefined;
  }
  await unlockAndAnnounce(ctx, inv, client, out, result.unlockable);
  return runInvocation(ctx, client, inv, out, { skipUnlockOffer: true });
};

const runRead = async (
  ctx: Ctx,
  client: Client,
  inv: Invocation,
  out: Out,
  interactive: boolean,
  options: Options
) => {
  const res = await callWithUnlockRetry(ctx, inv, client, out, interactive, () =>
    client.invoke({ rpc: inv.method.rpc, request: { ...inv.request } })
  );
  if (res.kind === 'plan') {
    return showUnexpectedPlan(ctx, inv, out, res);
  }
  await recordHistory(ctx, inv);
  if (out.json) {
    return out.raw(res.response);
  }
  out.body(resultLines(ctx, inv, out, res));
  if (!interactive || options.skipUnlockOffer) {
    return 0;
  }
  return (await offerAfterHidden(ctx, inv, client, out, res)) ?? 0;
};

// A plan that will not be executed in this run (non-interactive, or a read that unexpectedly planned).
const showPlanOnly = (ctx: Ctx, inv: Invocation, out: Out, plan: InvokePlan): number => {
  if (out.json) {
    out.chrome(
      renderWarning(ctx.theme, 'Dry run only. Add --yes to run it for real (dev and staging).')
    );
    return out.raw(plan);
  }
  out.body([
    ...renderFooter(ctx.theme, plan.durationMs),
    ...renderWarning(ctx.theme, 'Not run. Add --yes to run it for real (dev and staging).'),
  ]);
  return 0;
};

const showUnexpectedPlan = (ctx: Ctx, inv: Invocation, out: Out, plan: InvokePlan): number => {
  if (!out.json) {
    out.body(renderPlan(plan, fmt(ctx, inv)));
  }
  return showPlanOnly(ctx, inv, out, plan);
};

const confirmed = async (ctx: Ctx, step: 'confirm' | 'confirm-prod'): Promise<boolean> => {
  if (step === 'confirm') {
    return ctx.prompts.confirm({ message: 'Run this for real?', initialValue: false });
  }
  const typed = await ctx.prompts.text({
    message: `Type ${PROD_CONFIRMATION} to run this for real`,
    validate: validateProdConfirmation,
  });
  return typed.trim() === PROD_CONFIRMATION;
};

const runWrite = async (
  ctx: Ctx,
  client: Client,
  inv: Invocation,
  out: Out,
  interactive: boolean
) => {
  assertYesAllowed(inv.env, inv.globals.yes);
  if (inv.env === 'prod') {
    out.chrome(renderProdBanner(ctx.theme, ctx.columns));
  }
  const preview = await callWithUnlockRetry(ctx, inv, client, out, interactive, () =>
    client.invoke({ rpc: inv.method.rpc, request: { ...inv.request }, mode: 'preview' })
  );
  await recordHistory(ctx, inv);
  if (preview.kind === 'result') {
    if (out.json) {
      return out.raw(preview.response);
    }
    out.body(resultLines(ctx, inv, out, preview));
    return 0;
  }
  if (!out.json) {
    out.body(renderPlan(preview, fmt(ctx, inv)));
  }
  const step = decideWrite({ interactive, env: inv.env, yes: inv.globals.yes });
  if (step.action === 'show-only') {
    return showPlanOnly(ctx, inv, out, preview);
  }
  if (step.action !== 'execute' && !(await confirmed(ctx, step.action))) {
    out.chrome(['', `  ${ctx.theme.dim('Nothing was changed.')}`]);
    return 0;
  }
  const done = await client.invoke({
    rpc: inv.method.rpc,
    request: { ...inv.request },
    mode: 'execute',
    planId: preview.planId,
    ...(inv.env === 'prod' ? { confirm: PROD_CONFIRMATION } : {}),
  });
  if (done.kind === 'plan') {
    return showUnexpectedPlan(ctx, inv, out, done);
  }
  if (out.json) {
    return out.raw(done.response);
  }
  out.body([
    '',
    ...renderSuccess(ctx.theme, `Done - ${inv.method.rpc}`),
    '',
    ...resultLines(ctx, inv, out, done),
  ]);
  return 0;
};

export const runInvocation = async (
  ctx: Ctx,
  client: Client,
  inv: Invocation,
  out: Out,
  options: Options = {}
): Promise<number> => {
  const interactive = isInteractive(ctx) && !out.json;
  if (inv.method.kind === 'write') {
    assertYesAllowed(inv.env, inv.globals.yes);
  }
  if (interactive && !options.skipUnlockOffer) {
    await offerBeforeCalling(ctx, inv, client, out);
  }
  return inv.method.kind === 'read'
    ? runRead(ctx, client, inv, out, interactive, options)
    : runWrite(ctx, client, inv, out, interactive);
};
