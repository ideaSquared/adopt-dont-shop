import { describe, expect, it } from 'vitest';
import { createClient } from './client.js';
import { CliError } from './errors.js';
import {
  ensureSession,
  isUsable,
  pollForSession,
  sanitizeLogin,
  validateLogin,
  withAuth,
} from './login.js';
import { apiError, json, makeCtx, sampleSession } from './test-support.js';

const START = {
  deviceCode: 'dev-code',
  userCode: 'ABCD-1234',
  verificationUri: 'https://github.com/login/device',
  interval: 5,
  expiresIn: 900,
};

describe('login names', () => {
  it('derives an allowed login from a git user.name', () => {
    expect(sanitizeLogin('Alice Example')).toBe('Alice-Example');
    expect(sanitizeLogin("  O'Brien, Bob!  ")).toBe('OBrien-Bob');
    expect(sanitizeLogin('x'.repeat(60))).toHaveLength(39);
    expect(sanitizeLogin('---')).toBe('');
  });

  it('validates logins', () => {
    expect(validateLogin('alice-1')).toBeUndefined();
    expect(validateLogin('')).toBeDefined();
    expect(validateLogin('a b')).toBeDefined();
  });
});

describe('device-flow polling', () => {
  const run = async (responses: unknown[]) => {
    const queue = [...responses];
    const ctx = await makeCtx({ routes: () => json(queue.shift() ?? { status: 'pending' }) });
    const client = createClient({ fetch: ctx.fetch, baseUrl: 'http://x', env: 'staging' });
    const waits: number[] = [];
    const sleeps: number[] = [];
    const result = await pollForSession({
      client,
      start: START,
      now: ctx.now,
      sleep: async ms => {
        sleeps.push(ms);
        ctx.clock.now += ms;
      },
      onWait: s => waits.push(s),
    }).catch((e: unknown) => e);
    return { result, sleeps, waits };
  };

  it('returns the session once GitHub says ok', async () => {
    const { result, sleeps } = await run([
      { status: 'pending' },
      { status: 'ok', session: sampleSession() },
    ]);
    expect((result as { operator: { login: string } }).operator.login).toBe('alice');
    expect(sleeps).toEqual([5000, 5000]);
  });

  it('slows down when told to', async () => {
    const { sleeps } = await run([
      { status: 'slow_down', interval: 10 },
      { status: 'ok', session: sampleSession() },
    ]);
    expect(sleeps).toEqual([5000, 10000]);
  });

  it('stops with a clear message on expired and denied', async () => {
    const expired = await run([{ status: 'expired' }]);
    expect(expired.result).toBeInstanceOf(CliError);
    expect((expired.result as CliError).message).toContain('expired');
    const denied = await run([{ status: 'denied', reason: 'you are not in the ops team.' }]);
    expect((denied.result as CliError).message).toContain('not in the ops team');
  });

  it('gives up when the code runs out, and reports the countdown', async () => {
    const { result, waits } = await run(Array.from({ length: 400 }, () => ({ status: 'pending' })));
    expect((result as CliError).message).toContain('expired');
    expect(waits[0]).toBe(900);
    expect(waits.length).toBeGreaterThan(10);
  });
});

describe('sessions', () => {
  it('treats sessions about to expire as unusable', () => {
    const now = Date.parse('2026-10-12T14:00:00Z');
    expect(isUsable(sampleSession({ expiresAt: '2026-10-12T14:00:10.000Z' }), now)).toBe(false);
    expect(isUsable(sampleSession({ expiresAt: '2026-10-12T15:00:00.000Z' }), now)).toBe(true);
  });

  it('reuses a stored, unexpired session', async () => {
    const ctx = await makeCtx({ routes: () => undefined });
    await ctx.store.saveSession('dev', sampleSession());
    const client = createClient({ fetch: ctx.fetch, baseUrl: 'http://x', env: 'dev' });
    expect((await ensureSession(ctx, 'dev', client)).operator.login).toBe('alice');
  });

  it('refuses to log in without a terminal', async () => {
    const ctx = await makeCtx({ routes: () => undefined });
    const client = createClient({ fetch: ctx.fetch, baseUrl: 'http://x', env: 'dev' });
    await expect(ensureSession(ctx, 'dev', client)).rejects.toThrow(/not signed in to dev/);
  });

  it('logs in to dev by itself in a terminal, asking for a name once and remembering it', async () => {
    const ctx = await makeCtx({
      tty: true,
      answers: { text: ['alice'] },
      routes: ({ path }) =>
        path === '/v1/login/local' ? json({ session: sampleSession() }) : undefined,
    });
    const client = createClient({ fetch: ctx.fetch, baseUrl: 'http://x', env: 'dev' });
    await ensureSession(ctx, 'dev', client);
    expect((await ctx.store.readConfig()).devLogin).toBe('alice');
    expect((await ctx.store.getSession('dev'))?.operator.login).toBe('alice');
    expect(ctx.requests.find(r => r.path === '/v1/login/local')?.body).toEqual({ login: 'alice' });
    // second time: remembered, no prompt needed
    await ctx.store.clearSession('dev');
    await ensureSession(ctx, 'dev', client);
    expect(ctx.prompts.asked.filter(m => m.includes('What name'))).toHaveLength(1);
  });

  it('runs the GitHub device flow for staging: shows the code, copies it, opens the browser', async () => {
    let polls = 0;
    const opened: string[] = [];
    const copied: string[] = [];
    const ctx = await makeCtx({
      tty: true,
      routes: ({ path }) => {
        if (path === '/v1/login/start') {
          return json(START);
        }
        polls += 1;
        return json(polls < 2 ? { status: 'pending' } : { status: 'ok', session: sampleSession() });
      },
    });
    const wired = {
      ...ctx,
      copyToClipboard: async (t: string) => (copied.push(t), true),
      openUrl: async (u: string) => void opened.push(u),
    };
    const client = createClient({ fetch: ctx.fetch, baseUrl: 'http://x', env: 'staging' });
    await ensureSession(wired, 'staging', client);
    expect(copied).toEqual(['ABCD-1234']);
    expect(opened).toEqual(['https://github.com/login/device']);
    expect(ctx.stdout()).toContain('A B C D - 1 2 3 4');
    expect(ctx.stdout()).toContain('Code copied to your clipboard');
  });

  it('keeps going when clipboard and browser helpers fail', async () => {
    const ctx = await makeCtx({
      tty: true,
      routes: ({ path }) =>
        path === '/v1/login/start' ? json(START) : json({ status: 'ok', session: sampleSession() }),
    });
    const wired = {
      ...ctx,
      copyToClipboard: async () => {
        throw new Error('no clipboard');
      },
      openUrl: async () => {
        throw new Error('no browser');
      },
    };
    const client = createClient({ fetch: ctx.fetch, baseUrl: 'http://x', env: 'staging' });
    await expect(ensureSession(wired, 'staging', client)).resolves.toBeDefined();
    expect(ctx.stdout()).not.toContain('clipboard');
  });
});

describe('re-login on revoked sessions', () => {
  it('signs in again once and retries', async () => {
    let calls = 0;
    const ctx = await makeCtx({
      tty: true,
      answers: { text: ['alice'] },
      routes: ({ path }) => {
        if (path === '/v1/login/local') {
          return json({ session: sampleSession({ token: 'y'.repeat(40) }) });
        }
        calls += 1;
        return calls === 1 ? apiError(401, 'UNAUTHENTICATED', 'revoked') : json({ ok: 1 });
      },
    });
    await ctx.store.saveSession('dev', sampleSession());
    const result = await withAuth(ctx, 'dev', 'http://x', async client => {
      await client.whoami().catch(() => undefined);
      return 'done';
    });
    expect(result).toBe('done');
  });

  it('does not loop without a terminal', async () => {
    const ctx = await makeCtx({ routes: () => apiError(401, 'UNAUTHENTICATED', 'revoked') });
    await ctx.store.saveSession('dev', sampleSession());
    await expect(withAuth(ctx, 'dev', 'http://x', client => client.whoami())).rejects.toMatchObject(
      { code: 'UNAUTHENTICATED' }
    );
  });
});
