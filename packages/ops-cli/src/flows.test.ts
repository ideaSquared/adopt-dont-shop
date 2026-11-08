import { describe, expect, it } from 'vitest';
import { EXPECTED_ENV_HEADER, type InvokeRequest } from '@adopt-dont-shop/ops-contract';
import { CancelledError } from './errors.js';
import { main } from './router.js';
import {
  PET_ID,
  PLAN_ID,
  apiError,
  json,
  makeCtx,
  planResponse,
  resultResponse,
  sampleCatalog,
  sampleSession,
  type FakeCtx,
  type Route,
} from './test-support.js';

type Handler = (body: InvokeRequest) => ReturnType<Route>;

const UNLOCK = {
  unlockId: '33333333-3333-4333-8333-333333333333',
  subjectType: 'any',
  subjectId: null,
  reason: 'looking into a failed email',
  ticket: 'ADS-77',
  createdAt: '2026-10-12T14:00:00.000Z',
  expiresAt: '2026-10-12T14:30:00.000Z',
};

const server =
  (invoke: Handler, extra: Route = () => undefined): Route =>
  req => {
    const custom = extra(req);
    if (custom) {
      return custom;
    }
    if (req.path === '/health/ready') {
      return json({ ok: true });
    }
    if (req.path === '/v1/catalog') {
      return json({ ...sampleCatalog, env: req.headers.get(EXPECTED_ENV_HEADER) });
    }
    if (req.path === '/v1/invoke') {
      return invoke(req.body as InvokeRequest);
    }
    if (req.path === '/v1/unlocks' && req.method === 'GET') {
      return json({ unlocks: [] });
    }
    if (req.path === '/v1/unlocks' && req.method === 'POST') {
      return json({ unlock: UNLOCK });
    }
    return undefined;
  };

const signedIn = async (options: Parameters<typeof makeCtx>[0]): Promise<FakeCtx> => {
  const ctx = await makeCtx(options);
  await ctx.store.saveSession('dev', sampleSession());
  return ctx;
};

const invokes = (ctx: FakeCtx) =>
  ctx.requests.filter(r => r.path === '/v1/invoke').map(r => r.body as InvokeRequest);

const LIST = {
  pets: [{ petId: PET_ID, name: 'Biscuit', ownerEmail: { $hidden: true } }],
  total: 1,
};

describe('reads', () => {
  it('print only the masked JSON on stdout when piped, with the badge on stderr', async () => {
    const ctx = await signedIn({ routes: server(() => json(resultResponse(LIST))) });
    const code = await main(['pets', 'list', '--status', 'adopted'], ctx);
    expect(code).toBe(0);
    expect(JSON.parse(ctx.stdout())).toEqual(LIST);
    expect(ctx.stderr()).toContain('● dev');
    expect(invokes(ctx)[0]).toEqual({
      rpc: 'pets.List',
      request: { status: 'PET_STATUS_ADOPTED' },
    });
  });

  it('render a table with hidden markers and a footer in a terminal', async () => {
    const ctx = await signedIn({
      tty: true,
      routes: server(() =>
        json(resultResponse(LIST, { hidden: ['pets[0].ownerEmail'], unlockable: null }))
      ),
    });
    expect(await main(['pets', 'list'], ctx)).toBe(0);
    const out = ctx.stdout();
    expect(out).toContain('● dev');
    expect(out).toContain('pets (1)');
    expect(out).toContain('Biscuit');
    expect(out).toContain('‹hidden›');
    expect(out).toContain('1 field hidden');
    expect(out).toContain('12ms');
  });

  it('honour --output table', async () => {
    const ctx = await signedIn({ routes: server(() => json(resultResponse(LIST))) });
    await main(['pets', 'list', '-o', 'table'], ctx);
    expect(ctx.stdout()).toContain('1 row');
    expect(ctx.stdout()).toContain('PET ID');
  });

  it('remember the command (argv only, never responses) for `again`', async () => {
    const ctx = await signedIn({ routes: server(() => json(resultResponse(LIST))) });
    await main(['-e', 'dev', 'pets', 'list', '--status', 'adopted', '--yes'], ctx);
    const history = await ctx.store.readHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ env: 'dev', argv: ['pets', 'list', '--status', 'adopted'] });
    expect(JSON.stringify(history)).not.toContain('Biscuit');
    await main(['again'], ctx);
    expect(invokes(ctx)).toHaveLength(2);
    expect(invokes(ctx)[1]).toEqual(invokes(ctx)[0]);
  });

  it('say so when there is nothing to repeat', async () => {
    const ctx = await signedIn({ routes: server(() => undefined) });
    expect(await main(['again'], ctx)).toBe(1);
    expect(ctx.stderr()).toContain('Nothing to repeat yet');
  });
});

describe('catalog caching', () => {
  it('fetches once, then uses the cache, until --refresh', async () => {
    const ctx = await signedIn({ routes: server(() => json(resultResponse(LIST))) });
    const catalogCalls = () => ctx.requests.filter(r => r.path === '/v1/catalog').length;
    await main(['pets', 'list'], ctx);
    await main(['pets', 'list'], ctx);
    expect(catalogCalls()).toBe(1);
    await main(['pets', 'list', '--refresh'], ctx);
    expect(catalogCalls()).toBe(2);
  });

  it('refetches after an hour', async () => {
    const ctx = await signedIn({ routes: server(() => json(resultResponse(LIST))) });
    await main(['pets', 'list'], ctx);
    ctx.clock.now += 61 * 60 * 1000;
    await main(['pets', 'list'], ctx);
    expect(ctx.requests.filter(r => r.path === '/v1/catalog')).toHaveLength(2);
  });

  it('shows help from the cache without touching the network', async () => {
    const ctx = await signedIn({ routes: server(() => undefined) });
    await main(['pets', 'list'], ctx).catch(() => undefined);
    ctx.requests.length = 0;
    expect(await main(['pets', 'update-status', '--help'], ctx)).toBe(0);
    expect(ctx.requests).toEqual([]);
    const help = ctx.stdout();
    expect(help).toContain('pets update-status');
    expect(help).toContain('--pet-id <string>');
    expect(help).toContain('required');
    expect(help).toContain('unspecified | available | adopted');
    expect(help).toContain('rollback');
  });

  it('lists a service neatly from the cache', async () => {
    const ctx = await signedIn({ routes: server(() => undefined) });
    await main(['pets', 'list'], ctx).catch(() => undefined);
    await main(['pets', '-o', 'pretty'], ctx);
    const out = ctx.stdout();
    expect(out).toMatch(/list\s+READ\s+List pets/);
    expect(out).toMatch(/update-status\s+WRITE\s+Change status/);
  });
});

describe('writes', () => {
  const writeServer = (executed: InvokeRequest[] = []) =>
    server(body => {
      if (body.mode === 'execute') {
        executed.push(body);
        return json(resultResponse({ total: 1 }, { rpc: 'pets.UpdateStatus' }));
      }
      return json(planResponse());
    });
  const args = ['pets', 'update-status', PET_ID, '--status', 'adopted'];

  it('only preview without a terminal: the plan JSON on stdout, exit 0', async () => {
    const executed: InvokeRequest[] = [];
    const ctx = await signedIn({ routes: writeServer(executed) });
    expect(await main(args, ctx)).toBe(0);
    expect(JSON.parse(ctx.stdout())).toMatchObject({ kind: 'plan', planId: PLAN_ID });
    expect(ctx.stderr()).toContain('Dry run only');
    expect(executed).toEqual([]);
    expect(invokes(ctx)[0]).toMatchObject({
      mode: 'preview',
      request: { petId: PET_ID, status: 'PET_STATUS_ADOPTED' },
    });
  });

  it('execute with the planId when --yes is given in dev', async () => {
    const executed: InvokeRequest[] = [];
    const ctx = await signedIn({ routes: writeServer(executed) });
    expect(await main([...args, '--yes'], ctx)).toBe(0);
    expect(executed).toHaveLength(1);
    expect(executed[0]).toMatchObject({
      mode: 'execute',
      planId: PLAN_ID,
      request: { petId: PET_ID },
    });
    expect(executed[0]?.confirm).toBeUndefined();
  });

  it('refuse --yes in prod before calling anything, with exit code 2', async () => {
    const ctx = await makeCtx({ routes: server(() => undefined) });
    await ctx.store.saveSession('prod', sampleSession());
    await ctx.store.updateConfig(c => ({ ...c, ssh: { prod: { host: 'h', user: 'u' } } }));
    expect(await main([...args, '--yes', '-e', 'prod'], ctx)).toBe(2);
    expect(ctx.stderr()).toContain('--yes is not allowed in prod');
    expect(invokes(ctx)).toEqual([]);
  });

  it('render the dry-run plan in a terminal and ask "Run this for real?" (default No)', async () => {
    const executed: InvokeRequest[] = [];
    const ctx = await signedIn({
      tty: true,
      answers: { confirm: [false] },
      routes: writeServer(executed),
    });
    expect(await main(args, ctx)).toBe(0);
    const out = ctx.stdout();
    expect(out).toContain('DRY RUN - rolled back, nothing changed');
    expect(out).toContain('Request');
    expect(out).toContain('Would respond');
    expect(out).toContain('Nothing was changed');
    expect(ctx.prompts.asked).toEqual(['Run this for real?']);
    expect(executed).toEqual([]);
  });

  it('execute after a yes and show a green tick result', async () => {
    const executed: InvokeRequest[] = [];
    const ctx = await signedIn({
      tty: true,
      answers: { confirm: [true] },
      routes: writeServer(executed),
    });
    await main(args, ctx);
    expect(executed).toHaveLength(1);
    expect(ctx.stdout()).toContain('✔ Done - pets.UpdateStatus');
  });

  it('show warnings and PREVIEW ONLY for preview-only writes', async () => {
    const ctx = await signedIn({
      tty: true,
      answers: { confirm: [false] },
      routes: server(() =>
        json(
          planResponse({
            dryRun: 'preview-only',
            response: null,
            warnings: ['Sends email to 214 people'],
          })
        )
      ),
    });
    await main(args, ctx);
    expect(ctx.stdout()).toContain('PREVIEW ONLY - not simulated');
    expect(ctx.stdout()).toContain('Sends email to 214 people');
    expect(ctx.stdout()).not.toContain('Would respond');
  });

  it('in prod: banner, type-to-confirm, and confirm "prod" on execute', async () => {
    const executed: InvokeRequest[] = [];
    const ctx = await makeCtx({
      tty: true,
      answers: { text: ['prod'] },
      routes: writeServer(executed),
      columns: 40,
    });
    await ctx.store.saveSession('prod', sampleSession());
    await ctx.store.updateConfig(c => ({ ...c, ssh: { prod: { host: 'h', user: 'u' } } }));
    expect(await main([...args, '-e', 'prod'], ctx)).toBe(0);
    expect(ctx.stdout()).toContain('PRODUCTION  -  changes here are real');
    expect(ctx.prompts.asked).toEqual(['Type prod to run this for real']);
    expect(executed[0]).toMatchObject({ mode: 'execute', planId: PLAN_ID, confirm: 'prod' });
  });

  it('surface PLAN_EXPIRED with its hint', async () => {
    const ctx = await signedIn({
      routes: server(body =>
        body.mode === 'execute'
          ? apiError(410, 'PLAN_EXPIRED', 'plan expired', 'Run the preview again')
          : json(planResponse())
      ),
    });
    expect(await main([...args, '--yes'], ctx)).toBe(1);
    expect(ctx.stderr()).toContain('PLAN_EXPIRED');
    expect(ctx.stderr()).toContain('Run the preview again');
  });
});

describe('hidden fields and unlocks', () => {
  const unlockAnswers = { text: ['looking into a failed email', 'ADS-77', '30'] };

  it('offer an unlock after a masked result, then re-run the command', async () => {
    let calls = 0;
    const ctx = await signedIn({
      tty: true,
      answers: { confirm: [true], ...unlockAnswers },
      routes: server(() => {
        calls += 1;
        return json(
          calls === 1
            ? resultResponse(LIST, {
                hidden: ['pets[0].ownerEmail'],
                unlockable: { subjectType: 'user', subjectId: 'u-1' },
              })
            : resultResponse({
                ...LIST,
                pets: [{ petId: PET_ID, name: 'Biscuit', ownerEmail: 'b@example.org' }],
              })
        );
      }),
    });
    expect(await main(['pets', 'list'], ctx)).toBe(0);
    expect(ctx.prompts.asked[0]).toBe(
      '1 field hidden. Unlock user u-1? Needs a reason + ticket and alerts #ops.'
    );
    const created = ctx.requests.find(r => r.method === 'POST' && r.path === '/v1/unlocks');
    expect(created?.body).toMatchObject({
      subjectType: 'user',
      subjectId: 'u-1',
      ticket: 'ADS-77',
      ttlMinutes: 30,
    });
    expect(invokes(ctx)).toHaveLength(2);
    expect(ctx.stdout()).toContain('b@example.org');
    expect(ctx.stdout()).toContain('Recorded in the audit log');
  });

  it('do not offer twice when declined', async () => {
    const ctx = await signedIn({
      tty: true,
      answers: { confirm: [false] },
      routes: server(() =>
        json(
          resultResponse(LIST, {
            hidden: ['x'],
            unlockable: { subjectType: 'any', subjectId: null },
          })
        )
      ),
    });
    await main(['pets', 'list'], ctx);
    expect(invokes(ctx)).toHaveLength(1);
  });

  it('offer an unlock BEFORE calling when a PII request field is set', async () => {
    const ctx = await signedIn({
      tty: true,
      answers: { confirm: [true], select: ['any'], ...unlockAnswers },
      routes: server(() => json(resultResponse({ pets: [], total: 0 }))),
    });
    await main(['pets', 'find-owner', '--owner-email', 'a@b.co'], ctx);
    const order = ctx.requests.map(r => `${r.method} ${r.path}`);
    expect(order.indexOf('POST /v1/unlocks')).toBeGreaterThan(-1);
    expect(order.indexOf('POST /v1/unlocks')).toBeLessThan(order.indexOf('POST /v1/invoke'));
    expect(ctx.prompts.asked[0]).toContain('Looking up by owner_email');
  });

  it('skip the pre-offer when the person is not in a terminal', async () => {
    const ctx = await signedIn({
      routes: server(() => json(resultResponse({ pets: [], total: 0 }))),
    });
    await main(['pets', 'find-owner', '--owner-email', 'a@b.co'], ctx);
    expect(ctx.requests.some(r => r.path === '/v1/unlocks')).toBe(false);
  });

  it('recover from UNLOCK_REQUIRED by offering an unlock and retrying', async () => {
    let calls = 0;
    const ctx = await signedIn({
      tty: true,
      answers: { confirm: [false, true], select: ['any'], ...unlockAnswers },
      routes: server(() => {
        calls += 1;
        return calls === 1
          ? apiError(403, 'UNLOCK_REQUIRED', 'needs unlock')
          : json(resultResponse({ pets: [], total: 0 }));
      }),
    });
    expect(await main(['pets', 'find-owner', '--owner-email', 'a@b.co'], ctx)).toBe(0);
    expect(calls).toBe(2);
  });

  it('create an unlock from the command line and revoke it again', async () => {
    const ctx = await signedIn({
      routes: server(
        () => undefined,
        ({ method, path }) =>
          method === 'DELETE' && path === '/v1/unlocks'
            ? { status: 204 }
            : path === '/v1/unlocks' && method === 'GET'
              ? json({ unlocks: [UNLOCK] })
              : undefined
      ),
    });
    expect(
      await main(
        ['unlock', 'any', '--reason', 'looking into a failed email', '--ticket', 'ADS-77'],
        ctx
      )
    ).toBe(0);
    expect(
      ctx.requests.find(r => r.method === 'POST' && r.path === '/v1/unlocks')?.body
    ).toMatchObject({
      subjectType: 'any',
      subjectId: null,
      ttlMinutes: 30,
    });
    expect(await main(['lock', '-o', 'pretty'], ctx)).toBe(0);
    expect(ctx.stdout()).toContain('Locked again (1 unlock revoked)');
  });

  it('reject unknown unlock subjects as a usage error', async () => {
    const ctx = await signedIn({ routes: server(() => undefined) });
    expect(await main(['unlock', 'dog', 'x'], ctx)).toBe(2);
    expect(await main(['unlock', 'user'], ctx)).toBe(2);
  });
});

describe('errors and exit codes', () => {
  it('say "Can\'t reach dev" with a doctor hint, exit 1', async () => {
    const ctx = await makeCtx({ routes: () => undefined });
    expect(await main(['whoami', '-e', 'dev'], ctx)).toBe(1);
    expect(ctx.stderr()).toContain("Can't reach dev.");
    expect(ctx.stderr()).toContain('pnpm ops doctor');
  });

  it('exit 2 with a suggestion for typos', async () => {
    const ctx = await signedIn({ routes: server(() => undefined) });
    expect(await main(['pets', 'updat-status'], ctx)).toBe(2);
    expect(ctx.stderr()).toContain('Did you mean `update-status`?');
    expect(await main(['pet', 'list'], ctx)).toBe(2);
    expect(ctx.stderr()).toContain('Did you mean `pnpm ops pets`?');
    expect(await main(['pets', 'list', '--stauts', 'x'], ctx)).toBe(2);
    expect(ctx.stderr()).toContain('Did you mean `--status`?');
  });

  it('render the server error code, message and hint in a box', async () => {
    const ctx = await signedIn({
      routes: server(() => apiError(404, 'NOT_FOUND', 'pet not found', 'Check the id')),
    });
    expect(await main(['pets', 'list'], ctx)).toBe(1);
    const err = ctx.stderr();
    expect(err).toContain('✖ NOT_FOUND');
    expect(err).toContain('pet not found');
    expect(err).toContain('› Check the id');
  });

  it('report unexpected exceptions without a stack trace', async () => {
    const ctx = await signedIn({ routes: server(() => undefined) });
    const exploding = {
      ...ctx,
      fetch: async () => {
        throw new RangeError('boom');
      },
    } as FakeCtx;
    expect(
      await main(['whoami'], {
        ...exploding,
        fetch: ctx.fetch,
        store: {
          ...ctx.store,
          readConfig: async () => {
            throw new RangeError('boom');
          },
        },
      })
    ).toBe(1);
    expect(ctx.stderr()).toContain('Unexpected error: boom');
  });

  it('exit 1 quietly when a prompt is cancelled', async () => {
    const base = await signedIn({ tty: true, routes: server(() => json(planResponse())) });
    const cancelling = {
      ...base,
      prompts: {
        ...base.prompts,
        confirm: async () => {
          throw new CancelledError();
        },
      },
    };
    expect(await main(['pets', 'update-status', PET_ID, '--status', 'adopted'], cancelling)).toBe(
      1
    );
    expect(base.stderr()).toBe('');
  });

  it('tell a corrupt config how to recover', async () => {
    const ctx = await makeCtx({ routes: () => undefined });
    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir(ctx.store.dir, { recursive: true });
    await writeFile(ctx.store.paths.config, '{{');
    expect(await main(['whoami'], ctx)).toBe(1);
    expect(ctx.stderr()).toContain('unreadable');
    expect(ctx.stderr()).toContain('pnpm ops setup');
  });
});

describe('top-level commands', () => {
  it('print the version and short help without any setup', async () => {
    const ctx = await makeCtx();
    expect(await main(['--version'], ctx)).toBe(0);
    expect(ctx.stdout()).toBe('ads-ops 9.9.9\n');
    const help = await makeCtx();
    expect(await main(['help'], help)).toBe(0);
    expect(help.stdout()).toContain('pnpm ops <service> <command>');
    expect(help.stdout()).toContain('EXAMPLES');
    const noArgs = await makeCtx();
    expect(await main([], noArgs)).toBe(0);
    expect(noArgs.stdout()).toContain('GET STARTED');
  });

  it('route `help <service>` to the service listing', async () => {
    const ctx = await signedIn({ routes: server(() => undefined) });
    await main(['pets', 'list'], ctx).catch(() => undefined);
    await main(['help', 'pets', 'list', '-o', 'pretty'], ctx);
    expect(ctx.stdout()).toContain('pets list');
  });

  it('persist `use` and let flags and ADS_OPS_ENV override it', async () => {
    const ctx = await makeCtx({ routes: server(() => undefined) });
    expect(await main(['use', 'staging'], ctx)).toBe(0);
    expect((await ctx.store.readConfig()).currentEnv).toBe('staging');
    expect(ctx.stdout()).toContain('● staging');
    expect(await main(['use', 'prod'], ctx)).toBe(0);
    expect(ctx.stdout()).toContain('PRODUCTION');
    expect(ctx.stdout()).toContain('type `prod`');
    expect(await main(['use', 'stagin'], ctx)).toBe(2);
    expect(ctx.stderr()).toContain('Did you mean `pnpm ops use staging`?');
    expect(await main(['use'], ctx)).toBe(2);
    const viaEnv = await makeCtx({ env: { ADS_OPS_ENV: 'qa' }, routes: () => undefined });
    expect(await main(['whoami'], viaEnv)).toBe(2);
    expect(viaEnv.stderr()).toContain('ADS_OPS_ENV');
  });

  it('let `use` pick interactively', async () => {
    const ctx = await makeCtx({ tty: true, answers: { select: ['staging'] } });
    await main(['use'], ctx);
    expect((await ctx.store.readConfig()).currentEnv).toBe('staging');
  });

  it('log in, show whoami with unlock time left, and log out', async () => {
    const ctx = await makeCtx({
      routes: ({ path }) => {
        if (path === '/health/ready') return json({});
        if (path === '/v1/login/local')
          return json({ session: sampleSession({ expiresAt: '2026-10-12T21:54:30.000Z' }) });
        if (path === '/v1/whoami') {
          return json({
            env: 'dev',
            operator: sampleSession().operator,
            sessionExpiresAt: '2026-10-12T21:54:30.000Z',
            unlocks: [UNLOCK],
          });
        }
        if (path === '/v1/logout') return { status: 204 };
        return undefined;
      },
    });
    expect(await main(['login', '-o', 'pretty'], ctx)).toBe(0);
    expect(ctx.stdout()).toContain('Signed in to dev as alice');
    expect(await main(['whoami', '-o', 'pretty'], ctx)).toBe(0);
    const out = ctx.stdout();
    expect(out).toContain('alice');
    expect(out).toContain('expires 12 Oct 2026, 21:54 (in 7h 54m)');
    expect(out).toContain('30 min left');
    expect(await main(['logout', '-o', 'pretty'], ctx)).toBe(0);
    expect(await ctx.store.getSession('dev')).toBeUndefined();
    expect(await main(['logout', '-o', 'pretty'], ctx)).toBe(0);
    expect(ctx.stdout()).toContain('You were not signed in');
  });

  it('show server history as a table', async () => {
    const ctx = await signedIn({
      routes: ({ path }) =>
        path === '/health/ready'
          ? json({})
          : json({
              entries: [
                {
                  at: '2026-10-12T14:03:00.000Z',
                  rpc: 'pets.List',
                  kind: 'read',
                  mode: 'run',
                  outcome: 'ok',
                  errorCode: null,
                  revealedFields: [],
                },
              ],
            }),
    });
    expect(await main(['history', '5', '-o', 'pretty'], ctx)).toBe(0);
    expect(ctx.stdout()).toContain('12 Oct 2026, 14:03');
    expect(ctx.requests.at(-1)?.path).toBe('/v1/history?limit=5');
    expect(await main(['history', '500'], ctx)).toBe(2);
  });

  it('print completion scripts and candidates', async () => {
    const ctx = await signedIn({ routes: server(() => json(resultResponse(LIST))) });
    await main(['pets', 'list'], ctx);
    const out = await makeCtx();
    expect(await main(['completion', 'zsh'], out)).toBe(0);
    expect(out.stdout()).toContain('compdef');
    const words = { ...ctx };
    const before = ctx.stdout().length;
    await main(['__complete', 'pets', ''], words);
    expect(ctx.stdout().slice(before)).toBe('find-owner\nlist\nupdate-status\n');
  });

  it('manage the tunnel', async () => {
    const base = await makeCtx({ routes: () => undefined });
    const ctx = {
      ...base,
      exec: async () => ({
        code: 0,
        stdout: 'ssh -N -L 14101:127.0.0.1:4101 u@h\n',
        stderr: '',
      }),
    };
    await ctx.store.writeTunnel('staging', { pid: 5, startedAt: '2026-10-12T14:00:00.000Z' });
    expect(await main(['tunnel', 'status', '-o', 'pretty'], ctx)).toBe(0);
    expect(ctx.stdout()).toContain('down');
    expect(await main(['tunnel', 'stop', 'all', '-o', 'pretty'], ctx)).toBe(0);
    expect(ctx.stdout()).toContain('Stopped the staging tunnel');
    expect(await main(['tunnel', 'bogus'], ctx)).toBe(2);
  });
});

describe('interactive mode', () => {
  it('walks service, command and fields, then runs it and teaches the equivalent command', async () => {
    const executed: InvokeRequest[] = [];
    const ctx = await signedIn({
      tty: true,
      answers: {
        select: ['pets', 'update-status', 'PET_STATUS_ADOPTED', 'no'],
        text: [PET_ID],
        confirm: [true],
      },
      routes: server(body => {
        if (body.mode === 'execute') {
          executed.push(body);
          return json(resultResponse({ total: 1 }));
        }
        return json(planResponse());
      }),
    });
    expect(await main([], ctx)).toBe(0);
    expect(ctx.prompts.asked).toEqual([
      'Which service?',
      'Which pets command?',
      'petId',
      'status (optional)',
      'notifyAdopter (optional)',
      'Run this for real?',
    ]);
    expect(
      ctx.prompts.logs.some(l =>
        l.includes(`pnpm ops pets update-status ${PET_ID} --status adopted --no-notify-adopter`)
      )
    ).toBe(true);
    expect(executed[0]?.request).toEqual({
      petId: PET_ID,
      status: 'PET_STATUS_ADOPTED',
      notifyAdopter: false,
    });
  });
});
