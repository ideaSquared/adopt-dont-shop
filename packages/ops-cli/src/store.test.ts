import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigCorruptError } from './errors.js';
import { HISTORY_LIMIT, createStore, resolveConfigDir } from './store.js';
import { sampleCatalog, sampleSession } from './test-support.js';

const freshStore = async () => createStore(await mkdtemp(join(tmpdir(), 'ads-ops-store-')));

describe('config directory', () => {
  it('uses XDG_CONFIG_HOME, then ~/.config', () => {
    expect(resolveConfigDir({ XDG_CONFIG_HOME: '/x' }, 'linux', '/home/a')).toBe('/x/ads-ops');
    expect(resolveConfigDir({}, 'darwin', '/home/a')).toBe('/home/a/.config/ads-ops');
  });

  it('uses %APPDATA% on Windows', () => {
    expect(resolveConfigDir({ APPDATA: '/roaming' }, 'win32', '/home/a')).toBe('/roaming/ads-ops');
    expect(resolveConfigDir({}, 'win32', '/home/a')).toBe('/home/a/AppData/Roaming/ads-ops');
  });
});

describe('config.json', () => {
  it('defaults to dev with no SSH settings when missing', async () => {
    const store = await freshStore();
    expect(await store.configExists()).toBe(false);
    expect(await store.readConfig()).toEqual({ currentEnv: 'dev', ssh: {} });
  });

  it('round-trips and updates', async () => {
    const store = await freshStore();
    await store.updateConfig(c => ({
      ...c,
      currentEnv: 'staging',
      ssh: { staging: { host: 'h', user: 'u', identityFile: '~/.ssh/id' } },
    }));
    expect(await store.configExists()).toBe(true);
    expect((await store.readConfig()).ssh.staging?.host).toBe('h');
    expect((await store.readConfig()).currentEnv).toBe('staging');
  });

  it('explains how to reset a file that is not JSON', async () => {
    const store = await freshStore();
    await writeFile(store.paths.config, '{oops').catch(async () => {
      await mkdir(store.dir, { recursive: true });
      await writeFile(store.paths.config, '{oops');
    });
    const error = await store.readConfig().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConfigCorruptError);
    expect((error as ConfigCorruptError).hint).toContain(`rm "${store.paths.config}"`);
    expect((error as ConfigCorruptError).hint).toContain('pnpm ops setup');
  });

  it('rejects well-formed JSON with the wrong shape', async () => {
    const store = await freshStore();
    await mkdir(store.dir, { recursive: true });
    await writeFile(store.paths.config, JSON.stringify({ currentEnv: 'moon' }));
    await expect(store.readConfig()).rejects.toBeInstanceOf(ConfigCorruptError);
  });
});

describe('sessions.json', () => {
  it('is private to the user', async () => {
    const store = await freshStore();
    await store.saveSession('dev', sampleSession());
    expect((await stat(store.paths.sessions)).mode & 0o777).toBe(0o600);
    expect((await store.getSession('dev'))?.operator.login).toBe('alice');
    expect(await store.getSession('prod')).toBeUndefined();
  });

  it('keeps other environments when one signs out', async () => {
    const store = await freshStore();
    await store.saveSession('dev', sampleSession());
    await store.saveSession('prod', sampleSession());
    await store.clearSession('dev');
    expect(await store.getSession('dev')).toBeUndefined();
    expect(await store.getSession('prod')).toBeDefined();
  });

  it('treats a corrupt file as no sessions', async () => {
    const store = await freshStore();
    await store.saveSession('dev', sampleSession());
    await writeFile(store.paths.sessions, 'garbage');
    expect(await store.getSession('dev')).toBeUndefined();
  });
});

describe('history.jsonl', () => {
  it('keeps only the last 200 commands, argv only', async () => {
    const store = await freshStore();
    await Array.from({ length: HISTORY_LIMIT + 5 }).reduce<Promise<void>>(async (prev, _, i) => {
      await prev;
      await store.appendHistory({
        at: '2026-10-12T14:00:00.000Z',
        env: 'dev',
        argv: ['pets', String(i)],
      });
    }, Promise.resolve());
    const history = await store.readHistory();
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[history.length - 1]?.argv).toEqual(['pets', String(HISTORY_LIMIT + 4)]);
    expect(Object.keys(history[0] ?? {}).sort()).toEqual(['argv', 'at', 'env']);
  });

  it('skips damaged lines', async () => {
    const store = await freshStore();
    await store.appendHistory({ at: '2026-10-12T14:00:00.000Z', env: 'dev', argv: ['a'] });
    const text = await readFile(store.paths.history, 'utf8');
    await writeFile(store.paths.history, `${text}not json\n{"x":1}\n`);
    expect(await store.readHistory()).toHaveLength(1);
  });
});

describe('cache and tunnel records', () => {
  it('stores the catalog per environment', async () => {
    const store = await freshStore();
    await store.writeCatalogCache('dev', {
      fetchedAt: '2026-10-12T14:00:00.000Z',
      catalog: sampleCatalog,
    });
    expect((await store.readCatalogCache('dev'))?.catalog.services).toHaveLength(1);
    expect(await store.readCatalogCache('prod')).toBeUndefined();
  });

  it('stores and removes tunnel pids', async () => {
    const store = await freshStore();
    await store.writeTunnel('staging', { pid: 7, startedAt: '2026-10-12T14:00:00.000Z' });
    expect((await store.readTunnel('staging'))?.pid).toBe(7);
    await store.removeTunnel('staging');
    expect(await store.readTunnel('staging')).toBeUndefined();
  });
});
