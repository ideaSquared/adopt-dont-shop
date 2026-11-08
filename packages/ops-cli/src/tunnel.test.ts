import { describe, expect, it } from 'vitest';
import { UsageError } from './errors.js';
import { main } from './router.js';
import {
  connect,
  ensureTunnel,
  expandHome,
  stopTunnel,
  tunnelArgs,
  tunnelStatus,
} from './tunnel.js';
import { json, makeCtx } from './test-support.js';

const ssh = { host: 'ops.example.com', user: 'ads-ops', identityFile: '~/.ssh/id_ed25519' };

describe('tunnel command line', () => {
  it('forwards the env port to the remote service.ops loopback port', () => {
    expect(tunnelArgs('staging', ssh, '/home/me')).toEqual([
      '-N',
      '-o',
      'BatchMode=yes',
      '-o',
      'ExitOnForwardFailure=yes',
      '-o',
      'ServerAliveInterval=30',
      '-L',
      '14101:127.0.0.1:4101',
      '-i',
      '/home/me/.ssh/id_ed25519',
      'ads-ops@ops.example.com',
    ]);
    expect(tunnelArgs('prod', { host: 'h', user: 'u' }, '/h')).toContain('14102:127.0.0.1:4102');
  });

  it('omits -i without an identity file', () => {
    expect(tunnelArgs('prod', { host: 'h', user: 'u' }, '/h')).not.toContain('-i');
  });

  it('expands ~', () => {
    expect(expandHome('~', '/h')).toBe('/h');
    expect(expandHome('~/k', '/h')).toBe('/h/k');
    expect(expandHome('/abs', '/h')).toBe('/abs');
  });
});

describe('opening the tunnel lazily', () => {
  it('reuses a tunnel that already answers /health/ready', async () => {
    let spawned = 0;
    const ctx = {
      ...(await makeCtx({ routes: () => json({}) })),
      spawnDetached: () => ((spawned += 1), { pid: 1 }),
    };
    await ensureTunnel(ctx, 'staging');
    expect(spawned).toBe(0);
  });

  it('spawns ssh detached, records the pid, and waits until ready', async () => {
    const spawns: { cmd: string; args: readonly string[] }[] = [];
    let health = 0;
    const base = await makeCtx({
      routes: () => ((health += 1), health > 3 ? json({}) : undefined),
    });
    await base.store.updateConfig(c => ({ ...c, ssh: { staging: ssh } }));
    const ctx = {
      ...base,
      spawnDetached: (cmd: string, args: readonly string[]) => (
        spawns.push({ cmd, args }),
        { pid: 99 }
      ),
    };
    await ensureTunnel(ctx, 'staging');
    expect(spawns).toHaveLength(1);
    expect(spawns[0]?.cmd).toBe('ssh');
    expect((await ctx.store.readTunnel('staging'))?.pid).toBe(99);
  });

  it('explains what to do when ssh dies before the tunnel is up', async () => {
    const base = await makeCtx({ routes: () => undefined });
    await base.store.updateConfig(c => ({ ...c, ssh: { staging: ssh } }));
    const ctx = { ...base, isAlive: () => false };
    const error = await ensureTunnel(ctx, 'staging').catch((e: unknown) => e);
    expect(error).toMatchObject({ message: 'The SSH tunnel to staging did not come up.' });
    expect((error as { hint: string }).hint).toContain('ssh ads-ops@ops.example.com');
    expect(await ctx.store.readTunnel('staging')).toBeUndefined();
  });

  it('times out when ssh stays alive but nothing answers', async () => {
    const base = await makeCtx({ routes: () => undefined });
    await base.store.updateConfig(c => ({ ...c, ssh: { prod: ssh } }));
    await expect(ensureTunnel(base, 'prod')).rejects.toThrow(/did not come up/);
  });

  it('needs SSH settings first', async () => {
    const ctx = await makeCtx({ routes: () => undefined });
    await expect(ensureTunnel(ctx, 'staging')).rejects.toBeInstanceOf(UsageError);
  });

  it('fails clearly when ssh cannot be started', async () => {
    const base = await makeCtx({ routes: () => undefined });
    await base.store.updateConfig(c => ({ ...c, ssh: { staging: ssh } }));
    const ctx = { ...base, spawnDetached: () => ({}) };
    await expect(ensureTunnel(ctx, 'staging')).rejects.toThrow(/Could not start the ssh program/);
  });

  it('dev goes direct and says "Can\'t reach dev" when nothing listens', async () => {
    const ctx = await makeCtx({ routes: () => undefined });
    await expect(connect(ctx, 'dev')).rejects.toThrow("Can't reach dev.");
    const up = await makeCtx({ routes: () => json({}) });
    expect(await connect(up, 'dev')).toBe('http://127.0.0.1:4100');
  });
});

const STARTED = '2026-10-12T14:00:00.000Z';
const OUR_SSH =
  'ssh -N -o BatchMode=yes -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -L 14101:127.0.0.1:4101 ads-ops@ops.example.com';

const withProcess = async (args: string | undefined, platform = 'linux') => {
  const base = await makeCtx({ routes: () => json({}) });
  const killed: number[] = [];
  const execs: { command: string; args: readonly string[] }[] = [];
  const ctx = {
    ...base,
    platform,
    kill: (pid: number) => (killed.push(pid), true),
    exec: async (command: string, a: readonly string[]) => {
      execs.push({ command, args: a });
      return args === undefined
        ? { code: 1, stdout: '', stderr: '' }
        : { code: 0, stdout: `${args}\n`, stderr: '' };
    },
  };
  await ctx.store.writeTunnel('staging', { pid: 5, startedAt: STARTED });
  return { ctx, killed, execs };
};

describe('tunnel status and stop', () => {
  it('reports up and the pid when it is our ssh tunnel', async () => {
    const { ctx } = await withProcess(OUR_SSH);
    expect(await tunnelStatus(ctx, 'staging')).toEqual({ up: true, pid: 5 });
  });

  it('does not report the pid of an unrelated process', async () => {
    const { ctx } = await withProcess('/usr/bin/vim notes.txt');
    expect(await tunnelStatus(ctx, 'staging')).toEqual({ up: true, pid: undefined });
  });

  it('stops our ssh tunnel, checking identity with ps first', async () => {
    const { ctx, killed, execs } = await withProcess(OUR_SSH);
    expect(await stopTunnel(ctx, 'staging')).toBe('stopped');
    expect(execs).toEqual([{ command: 'ps', args: ['-p', '5', '-o', 'args='] }]);
    expect(killed).toEqual([5]);
    expect(await ctx.store.readTunnel('staging')).toBeUndefined();
    expect(await stopTunnel(ctx, 'staging')).toBe('not-running');
  });

  it('never signals an unrelated process that reused the pid, but forgets the stale record', async () => {
    const { ctx, killed } = await withProcess('/usr/bin/python3 server.py');
    expect(await stopTunnel(ctx, 'staging')).toBe('not-running');
    expect(killed).toEqual([]);
    expect(await ctx.store.readTunnel('staging')).toBeUndefined();
  });

  it('does not signal an ssh that forwards a different port', async () => {
    const { ctx, killed } = await withProcess(
      OUR_SSH.replace('14101:127.0.0.1:4101', '14102:127.0.0.1:4102')
    );
    expect(await stopTunnel(ctx, 'staging')).toBe('not-running');
    expect(killed).toEqual([]);
  });

  it('does not signal a non-ssh process whose arguments mention the forward', async () => {
    const { ctx, killed } = await withProcess('vim -L 14101:127.0.0.1:4101');
    expect(await stopTunnel(ctx, 'staging')).toBe('not-running');
    expect(killed).toEqual([]);
  });

  it('forgets the record when the process is gone', async () => {
    const { ctx, killed } = await withProcess(undefined);
    expect(await stopTunnel(ctx, 'staging')).toBe('not-running');
    expect(killed).toEqual([]);
    expect(await ctx.store.readTunnel('staging')).toBeUndefined();
  });

  it('on Windows never signals: it forgets the record and asks the person to close ssh', async () => {
    const { ctx, killed, execs } = await withProcess(OUR_SSH, 'win32');
    expect(await stopTunnel(ctx, 'staging')).toBe('manual');
    expect(killed).toEqual([]);
    expect(execs).toEqual([]);
    expect(await ctx.store.readTunnel('staging')).toBeUndefined();
  });

  it('tells the person what happened for each outcome of `tunnel stop`', async () => {
    const win = await withProcess(OUR_SSH, 'win32');
    await main(['tunnel', 'stop', '-e', 'staging'], win.ctx);
    expect(win.ctx.stdout()).toContain('close the ssh');
    const stale = await withProcess('/usr/bin/vim');
    await main(['tunnel', 'stop', '-e', 'staging'], stale.ctx);
    expect(stale.ctx.stdout()).toContain('No staging tunnel was running');
  });
});
