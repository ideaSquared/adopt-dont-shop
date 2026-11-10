import { describe, expect, it, vi } from 'vitest';

import { runBootstrapCli, stripTrailingNewline, type BootstrapCliDeps } from './bootstrap-admin.js';

const PASSWORD = 'CorrectHorse-Battery1!';
const ARGS = [
  '--password-stdin',
  '--email',
  'ops@example.test',
  '--first-name',
  'Ada',
  '--last-name',
  'Admin',
];

type Row = Record<string, unknown>;

// A pool whose guard queries find no existing super_admin or email, so the
// core bootstrap succeeds; `superAdmins` scripts the refusal path.
const makeDeps = (
  opts: { argv?: string[]; stdin?: string; superAdmins?: Row[] } = {}
): BootstrapCliDeps & {
  output: string[];
  errors: string[];
  pool: { end: ReturnType<typeof vi.fn> };
  nats: { drain: ReturnType<typeof vi.fn> };
  logged: unknown[];
} => {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('FROM auth.users') && sql.includes("'super_admin'")) {
      return { rows: opts.superAdmins ?? [] };
    }
    return { rows: [] };
  });
  const client = { query, release: vi.fn() };
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    end: vi.fn().mockResolvedValue(undefined),
  };
  const publish = vi.fn();
  const nats = {
    publish,
    jetstream: () => ({ publish }),
    drain: vi.fn().mockResolvedValue(undefined),
  };
  const output: string[] = [];
  const errors: string[] = [];
  const logged: unknown[] = [];
  return {
    argv: opts.argv ?? ARGS,
    env: {},
    readStdin: async () => opts.stdin ?? `${PASSWORD}\n`,
    // The CLI only needs the pool/NATS surface bootstrapSuperAdmin and the
    // cleanup path touch; casting the doubles is the repo convention for
    // injecting fakes into pg/nats-typed deps (see account-handlers.test.ts).
    openPool: () => pool as never,
    openNats: async () => nats as never,
    hash: async password => `hashed:${password}`,
    out: text => output.push(text),
    err: text => errors.push(text),
    log: {
      info: (message, meta) => logged.push({ message, meta }),
      error: (message, meta) => logged.push({ message, meta }),
    },
    output,
    errors,
    pool,
    nats,
    logged,
  };
};

describe('runBootstrapCli', () => {
  it('creates the super_admin, reports it on stdout and exits 0', async () => {
    const deps = makeDeps();

    const code = await runBootstrapCli(deps);

    expect(code).toBe(0);
    expect(deps.output.join('')).toMatch(/^super_admin created: ops@example\.test \(.+\)\n$/);
    expect(deps.errors).toEqual([]);
  });

  it('hashes the stdin password without its trailing newline', async () => {
    const deps = makeDeps({ stdin: `${PASSWORD}\r\n` });
    const hash = vi.spyOn(deps, 'hash');

    await runBootstrapCli(deps);

    expect(hash).toHaveBeenCalledWith(PASSWORD);
  });

  it('refuses with exit 1 and the usage text when a super_admin already exists', async () => {
    const deps = makeDeps({ superAdmins: [{ user_id: 'u-1' }] });

    const code = await runBootstrapCli(deps);

    expect(code).toBe(1);
    expect(deps.errors.join('')).toMatch(/bootstrap-admin failed: .*super_admin.*\nusage: /s);
    expect(deps.output).toEqual([]);
  });

  it('exits 1 before touching the database when --password-stdin is missing', async () => {
    const deps = makeDeps({ argv: ['--email', 'ops@example.test'] });
    const openPool = vi.spyOn(deps, 'openPool');

    const code = await runBootstrapCli(deps);

    expect(code).toBe(1);
    expect(deps.errors.join('')).toMatch(/--password-stdin is required/);
    expect(openPool).not.toHaveBeenCalled();
  });

  it('exits 1 with the usage text when the database cannot be opened', async () => {
    const deps = makeDeps();
    deps.openPool = () => {
      throw new Error('DATABASE_URL is required');
    };

    const code = await runBootstrapCli(deps);

    expect(code).toBe(1);
    expect(deps.errors.join('')).toMatch(/DATABASE_URL is required\nusage: /);
  });

  it('closes NATS and the pool whether it succeeds or fails', async () => {
    const ok = makeDeps();
    const refused = makeDeps({ superAdmins: [{ user_id: 'u-1' }] });

    await runBootstrapCli(ok);
    await runBootstrapCli(refused);

    for (const deps of [ok, refused]) {
      expect(deps.nats.drain).toHaveBeenCalledOnce();
      expect(deps.pool.end).toHaveBeenCalledOnce();
    }
  });

  it('never puts the password or the email in its structured logs', async () => {
    const ok = makeDeps();
    const refused = makeDeps({ superAdmins: [{ user_id: 'u-1' }] });

    await runBootstrapCli(ok);
    await runBootstrapCli(refused);

    const logs = JSON.stringify([...ok.logged, ...refused.logged]);
    expect(logs).not.toContain(PASSWORD);
    expect(logs).not.toContain('ops@example.test');
  });
});

describe('stripTrailingNewline', () => {
  it('removes one trailing LF or CRLF and keeps everything else', () => {
    expect(stripTrailingNewline('pw\n')).toBe('pw');
    expect(stripTrailingNewline('pw\r\n')).toBe('pw');
    expect(stripTrailingNewline('pw\n\n')).toBe('pw\n');
    expect(stripTrailingNewline(' pw ')).toBe(' pw ');
  });
});
