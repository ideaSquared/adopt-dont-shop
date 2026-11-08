import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import {
  CatalogResponseSchema,
  OpsEnvSchema,
  SessionSchema,
  type CatalogResponse,
  type OpsEnv,
  type Session,
} from '@adopt-dont-shop/ops-contract';
import { ConfigCorruptError } from './errors.js';

export const resolveConfigDir = (
  env: Readonly<Record<string, string | undefined>>,
  platform: string,
  home: string
): string => {
  if (platform === 'win32') {
    return join(env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'ads-ops');
  }
  return join(env.XDG_CONFIG_HOME || join(home, '.config'), 'ads-ops');
};

const SshSettingsSchema = z.object({
  host: z.string().min(1),
  user: z.string().min(1),
  identityFile: z.string().min(1).optional(),
});
export type SshSettings = z.infer<typeof SshSettingsSchema>;

export const ConfigSchema = z.object({
  currentEnv: OpsEnvSchema.default('dev'),
  ssh: z
    .object({ staging: SshSettingsSchema.optional(), prod: SshSettingsSchema.optional() })
    .default({}),
  devLogin: z.string().optional(),
});
export type Config = z.infer<typeof ConfigSchema>;

const SessionsSchema = z.partialRecord(OpsEnvSchema, SessionSchema);
const CatalogCacheSchema = z.object({
  fetchedAt: z.iso.datetime(),
  catalog: CatalogResponseSchema,
});
export type CatalogCache = z.infer<typeof CatalogCacheSchema>;
const TunnelRecordSchema = z.object({
  pid: z.number().int().positive(),
  startedAt: z.iso.datetime(),
});
export type TunnelRecord = z.infer<typeof TunnelRecordSchema>;
export const HistoryEntrySchema = z.object({
  at: z.iso.datetime(),
  env: OpsEnvSchema,
  argv: z.array(z.string()),
});
export type LocalHistoryEntry = z.infer<typeof HistoryEntrySchema>;

export const HISTORY_LIMIT = 200;

const readJson = async (path: string): Promise<unknown | undefined> => {
  const text = await readFile(path, 'utf8').catch(() => undefined);
  if (text === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new SyntaxError('not valid JSON');
  }
};

const writeFileEnsuringDir = async (path: string, content: string, mode?: number) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, { encoding: 'utf8', mode });
  if (mode !== undefined) {
    await chmod(path, mode);
  }
};

export const createStore = (dir: string) => {
  const paths = {
    config: join(dir, 'config.json'),
    sessions: join(dir, 'sessions.json'),
    history: join(dir, 'history.jsonl'),
    catalog: (env: OpsEnv) => join(dir, 'cache', `catalog-${env}.json`),
    tunnel: (env: OpsEnv) => join(dir, 'tunnels', `${env}.json`),
  };

  const readConfig = async (): Promise<Config> => {
    const raw = await readJson(paths.config).catch((e: unknown) => {
      throw new ConfigCorruptError(paths.config, e instanceof Error ? e.message : 'unreadable');
    });
    if (raw === undefined) {
      return ConfigSchema.parse({});
    }
    const parsed = ConfigSchema.safeParse(raw);
    if (parsed.success) {
      return parsed.data;
    }
    throw new ConfigCorruptError(paths.config, 'unexpected contents');
  };

  const configExists = async (): Promise<boolean> =>
    (await readFile(paths.config, 'utf8').catch(() => undefined)) !== undefined;

  const writeConfig = (config: Config) =>
    writeFileEnsuringDir(paths.config, `${JSON.stringify(config, null, 2)}\n`);

  const updateConfig = async (change: (c: Config) => Config) => {
    const next = change(await readConfig());
    await writeConfig(next);
    return next;
  };

  // Sessions, cache, tunnels and history are disposable: unreadable means absent.
  const readSessions = async (): Promise<z.infer<typeof SessionsSchema>> => {
    const raw = await readJson(paths.sessions).catch(() => undefined);
    const parsed = SessionsSchema.safeParse(raw ?? {});
    return parsed.success ? parsed.data : {};
  };

  const getSession = async (env: OpsEnv): Promise<Session | undefined> =>
    (await readSessions())[env];

  const saveSession = async (env: OpsEnv, session: Session) =>
    writeFileEnsuringDir(
      paths.sessions,
      `${JSON.stringify({ ...(await readSessions()), [env]: session }, null, 2)}\n`,
      0o600
    );

  const clearSession = async (env: OpsEnv) => {
    const { [env]: _removed, ...rest } = await readSessions();
    await writeFileEnsuringDir(paths.sessions, `${JSON.stringify(rest, null, 2)}\n`, 0o600);
  };

  const readHistory = async (): Promise<readonly LocalHistoryEntry[]> => {
    const text = await readFile(paths.history, 'utf8').catch(() => '');
    return text
      .split('\n')
      .filter(line => line.trim() !== '')
      .flatMap(line => {
        try {
          const parsed = HistoryEntrySchema.safeParse(JSON.parse(line));
          return parsed.success ? [parsed.data] : [];
        } catch {
          return [];
        }
      });
  };

  const appendHistory = async (entry: LocalHistoryEntry) => {
    const kept = [...(await readHistory()), entry].slice(-HISTORY_LIMIT);
    await writeFileEnsuringDir(paths.history, `${kept.map(e => JSON.stringify(e)).join('\n')}\n`);
  };

  const readCatalogCache = async (env: OpsEnv): Promise<CatalogCache | undefined> => {
    const raw = await readJson(paths.catalog(env)).catch(() => undefined);
    const parsed = CatalogCacheSchema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  };

  const writeCatalogCache = (env: OpsEnv, cache: { fetchedAt: string; catalog: CatalogResponse }) =>
    writeFileEnsuringDir(paths.catalog(env), JSON.stringify(cache));

  const readTunnel = async (env: OpsEnv): Promise<TunnelRecord | undefined> => {
    const raw = await readJson(paths.tunnel(env)).catch(() => undefined);
    const parsed = TunnelRecordSchema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  };

  const writeTunnel = (env: OpsEnv, record: TunnelRecord) =>
    writeFileEnsuringDir(paths.tunnel(env), JSON.stringify(record));

  const removeTunnel = (env: OpsEnv) => rm(paths.tunnel(env), { force: true });

  return {
    dir,
    paths,
    readConfig,
    configExists,
    writeConfig,
    updateConfig,
    getSession,
    saveSession,
    clearSession,
    readHistory,
    appendHistory,
    readCatalogCache,
    writeCatalogCache,
    readTunnel,
    writeTunnel,
    removeTunnel,
  };
};

export type Store = ReturnType<typeof createStore>;
