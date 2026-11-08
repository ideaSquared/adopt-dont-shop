import { readFileSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';
import type { Ctx } from './ctx.js';
import { createClackPrompts } from './prompts.js';
import { main } from './router.js';
import { createStore, resolveConfigDir } from './store.js';
import { sanitizeLogin } from './login.js';
import {
  copyToClipboard,
  exec,
  fileExists,
  isAlive,
  kill,
  openUrl,
  spawnDetached,
} from './system.js';
import { createTheme, detectColor, detectUnicode } from './ui/theme.js';

const readVersion = (): string => {
  try {
    const raw = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const version = (parsed as { version?: unknown }).version; // our own package.json, shape is known
    return typeof version === 'string' ? version : '0.0.0';
  } catch {
    return '0.0.0';
  }
};

const gitUserName = async (): Promise<string> => {
  const result = await exec('git', ['config', 'user.name']);
  return result.code === 0 ? result.stdout.trim() : '';
};

// The real process-level context. Everything else is pure or takes this.
export const createRealCtx = (argv: readonly string[]): Ctx => {
  const env = process.env;
  const platform = process.platform;
  const home = homedir();
  return {
    version: readVersion(),
    fetch: globalThis.fetch,
    now: () => Date.now(),
    sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
    env,
    platform,
    stdoutTTY: Boolean(process.stdout.isTTY),
    stdinTTY: Boolean(process.stdin.isTTY),
    columns: process.stdout.columns ?? 100,
    out: text => void process.stdout.write(text),
    err: text => void process.stderr.write(text),
    theme: createTheme({
      color: detectColor({ argv, env, isTTY: Boolean(process.stdout.isTTY) }),
      unicode: detectUnicode(env, platform),
    }),
    prompts: createClackPrompts(),
    store: createStore(resolveConfigDir(env, platform, home)),
    exec,
    spawnDetached,
    isAlive,
    kill,
    copyToClipboard: copyToClipboard(platform),
    openUrl: openUrl(platform),
    defaultLogin: async () => sanitizeLogin((await gitUserName()) || userInfo().username) || 'dev',
    fileExists,
    homeDir: home,
    repoRoot: fileURLToPath(new URL('../../../', import.meta.url)),
  };
};

export const run = (argv: readonly string[]): Promise<number> => main(argv, createRealCtx(argv));
