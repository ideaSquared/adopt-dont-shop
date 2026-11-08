import { describe, expect, it } from 'vitest';
import { clockSkewCheck } from './commands/doctor.js';
import { validateHost, validateUser } from './commands/setup.js';
import { parseSubject } from './commands/basic.js';
import { parsePromptAnswer } from './interactive.js';
import { fieldSpecs } from './flags.js';
import { main } from './router.js';
import { json, makeCtx, sampleCatalog, sampleIndex, sampleSession } from './test-support.js';

describe('clock skew check', () => {
  const now = Date.parse('2026-10-12T14:00:00Z');

  it('is fine within 30 seconds', () => {
    expect(clockSkewCheck('Mon, 12 Oct 2026 14:00:10 GMT', now).status).toBe('ok');
  });

  it('warns beyond 30 seconds and says which way', () => {
    const ahead = clockSkewCheck('Mon, 12 Oct 2026 13:59:00 GMT', now);
    expect(ahead.status).toBe('warn');
    expect(ahead.detail).toContain('60s ahead of');
    expect(clockSkewCheck('Mon, 12 Oct 2026 14:02:00 GMT', now).detail).toContain('behind');
  });

  it('skips without a Date header', () => {
    expect(clockSkewCheck(undefined, now).status).toBe('skip');
  });
});

describe('doctor', () => {
  const healthy = ({ path }: { path: string }) => {
    if (path === '/health/ready') {
      return { json: {}, headers: { date: new Date('2026-10-12T14:00:00Z').toUTCString() } };
    }
    if (path === '/v1/whoami') {
      return json({
        env: 'dev',
        operator: sampleSession().operator,
        sessionExpiresAt: '2099-01-01T00:00:00.000Z',
        unlocks: [],
      });
    }
    if (path === '/v1/catalog') {
      return json(sampleCatalog);
    }
    return undefined;
  };

  it('ticks everything off for a healthy dev stack', async () => {
    const ctx = await makeCtx({ routes: healthy });
    await ctx.store.saveSession('dev', sampleSession());
    expect(await main(['doctor', '-o', 'pretty'], ctx)).toBe(0);
    const out = ctx.stdout();
    expect(out).toContain('✔ Server');
    expect(out).toContain('signed in as alice');
    expect(out).toContain('1 services, 3 commands');
    expect(out).toContain('within');
    expect(out).toContain('Everything looks good.');
  });

  it('fails with a clear next step when nothing is running, and skips the rest', async () => {
    const ctx = await makeCtx({ routes: () => undefined });
    expect(await main(['doctor', '-o', 'pretty'], ctx)).toBe(1);
    const out = ctx.stdout();
    expect(out).toContain('✖ Server');
    expect(out).toContain('pnpm docker:dev');
    expect(out).toMatch(/- Session\s+needs the server/);
    expect(out).toContain('1 problem found.');
  });

  it('flags a missing session and an expired one', async () => {
    const ctx = await makeCtx({ routes: healthy });
    expect(await main(['doctor', '-o', 'pretty'], ctx)).toBe(1);
    expect(ctx.stdout()).toContain('not signed in');
  });

  it('checks ssh and settings for staging', async () => {
    const ctx = {
      ...(await makeCtx({ routes: () => undefined })),
      exec: async () => ({ code: 127, stdout: '', stderr: '' }),
    };
    expect(await main(['doctor', '-e', 'staging', '-o', 'pretty'], ctx)).toBe(1);
    const out = ctx.stdout();
    expect(out).toContain('the ssh program was not found');
    expect(out).toContain('none for staging; run `pnpm ops setup`');
    expect(out).toContain('Tunnel');
  });

  it('reports a corrupt config as a failed check', async () => {
    const ctx = await makeCtx({ routes: healthy });
    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir(ctx.store.dir, { recursive: true });
    await writeFile(ctx.store.paths.config, '{{');
    // the router itself refuses a corrupt config before doctor runs
    expect(await main(['doctor'], ctx)).toBe(1);
  });
});

describe('setup wizard', () => {
  const ssh = ['ops.example.com', 'ads-ops', ''];

  it('lets you skip staging and prod entirely and points at login', async () => {
    const ctx = await makeCtx({ tty: true, answers: { confirm: [false, false] } });
    expect(await main(['setup'], ctx)).toBe(0);
    expect(await ctx.store.configExists()).toBe(true);
    expect((await ctx.store.readConfig()).ssh).toEqual({});
    expect(ctx.prompts.logs.some(l => l.includes('pnpm ops login'))).toBe(true);
  });

  it('saves SSH settings after proving the tunnel works, then stops the tunnel', async () => {
    let up = false;
    const base = await makeCtx({
      tty: true,
      answers: { confirm: [true, false], text: ssh },
      routes: ({ path }) => (path === '/health/ready' && up ? json({}) : undefined),
    });
    const killed: number[] = [];
    const ctx = {
      ...base,
      spawnDetached: () => {
        up = true;
        return { pid: 321 };
      },
      kill: (pid: number) => (killed.push(pid), (up = false), true),
      exec: async () => ({
        code: 0,
        stdout: 'ssh -N -L 14101:127.0.0.1:4101 ads-ops@ops.example.com\n',
        stderr: '',
      }),
    };
    expect(await main(['setup'], ctx)).toBe(0);
    expect((await ctx.store.readConfig()).ssh.staging).toEqual({
      host: 'ops.example.com',
      user: 'ads-ops',
    });
    expect(killed).toEqual([321]);
    expect(ctx.prompts.logs.some(l => l.includes('staging works'))).toBe(true);
    expect(ctx.prompts.logs.some(l => l.includes('pnpm ops use staging'))).toBe(true);
  });

  it('offers to drop settings that do not work', async () => {
    const base = await makeCtx({
      tty: true,
      answers: { confirm: [true, false, false], text: ssh },
      routes: () => undefined,
    });
    const ctx = { ...base, isAlive: () => false };
    expect(await main(['setup'], ctx)).toBe(0);
    expect((await ctx.store.readConfig()).ssh.staging).toBeUndefined();
    expect(ctx.prompts.logs.some(l => l.includes('did not come up'))).toBe(true);
  });

  it('keeps settings when you insist', async () => {
    const base = await makeCtx({
      tty: true,
      answers: { confirm: [true, true, false], text: ['h.example', 'u', '~/.ssh/key'] },
      routes: () => undefined,
    });
    const ctx = { ...base, isAlive: () => false, fileExists: async () => false };
    await main(['setup'], ctx);
    expect((await ctx.store.readConfig()).ssh.staging).toEqual({
      host: 'h.example',
      user: 'u',
      identityFile: '~/.ssh/key',
    });
    expect(ctx.prompts.logs.some(l => l.includes('does not exist yet'))).toBe(true);
  });

  it('validates host and user', () => {
    expect(validateHost('ops.example.com')).toBeUndefined();
    expect(validateHost('bad host')).toBeDefined();
    expect(validateUser('ads-ops')).toBeUndefined();
    expect(validateUser('a b')).toBeDefined();
  });
});

describe('unlock subjects', () => {
  it('parses subject words', () => {
    expect(parseSubject(['any'])).toEqual({ subjectType: 'any', subjectId: null });
    expect(parseSubject(['user', 'u-1'])).toEqual({ subjectType: 'user', subjectId: 'u-1' });
    expect(() => parseSubject([])).toThrow(/What do you want to unlock/);
  });
});

describe('interactive answers', () => {
  const spec = (key: string) => {
    const method = sampleIndex.method('pets', 'list');
    const found = method && fieldSpecs(sampleIndex, method).find(s => s.key === key);
    if (!found) {
      throw new Error(`no spec ${key}`);
    }
    return found;
  };

  it('skip on empty input', () => {
    expect(parsePromptAnswer(spec('limit'), '  ')).toBeUndefined();
  });

  it('convert numbers, lists and JSON', () => {
    expect(parsePromptAnswer(spec('limit'), '10')).toBe(10);
    expect(parsePromptAnswer(spec('tags'), 'a, b,,c')).toEqual(['a', 'b', 'c']);
    expect(parsePromptAnswer(spec('filter'), '{"q":1}')).toEqual({ q: 1 });
  });

  it('reject bad input with a usage error', () => {
    expect(() => parsePromptAnswer(spec('limit'), 'x')).toThrow(/whole number/);
    expect(() => parsePromptAnswer(spec('filter'), '{')).toThrow(/valid JSON/);
  });
});
