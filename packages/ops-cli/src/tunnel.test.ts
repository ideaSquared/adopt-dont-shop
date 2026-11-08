import { describe, expect, it } from 'vitest';
import { UsageError } from './errors.js';
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

describe('tunnel status and stop', () => {
  it('reports up and the live pid', async () => {
    const ctx = await makeCtx({ routes: () => json({}) });
    await ctx.store.writeTunnel('staging', { pid: 5, startedAt: '2026-10-12T14:00:00.000Z' });
    expect(await tunnelStatus(ctx, 'staging')).toEqual({ up: true, pid: 5 });
  });

  it('stops the recorded process and forgets it', async () => {
    const killed: number[] = [];
    const base = await makeCtx({ routes: () => json({}) });
    const ctx = { ...base, kill: (pid: number) => (killed.push(pid), true) };
    await ctx.store.writeTunnel('staging', { pid: 5, startedAt: '2026-10-12T14:00:00.000Z' });
    expect(await stopTunnel(ctx, 'staging')).toBe(true);
    expect(killed).toEqual([5]);
    expect(await stopTunnel(ctx, 'staging')).toBe(false);
  });
});
