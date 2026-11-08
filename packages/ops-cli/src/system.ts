import { execFile, spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import type { ExecResult } from './ctx.js';

// Real implementations of the process-level edges. Best-effort helpers never throw.

export const exec = (command: string, args: readonly string[]): Promise<ExecResult> =>
  new Promise(resolve => {
    execFile(command, [...args], { timeout: 10_000 }, (error, stdout, stderr) => {
      const code = error ? (typeof error.code === 'number' ? error.code : null) : 0;
      resolve({ code, stdout: String(stdout), stderr: String(stderr) });
    });
  });

export const spawnDetached = (command: string, args: readonly string[]): { pid?: number } => {
  const child = spawn(command, [...args], { detached: true, stdio: 'ignore' });
  child.on('error', () => undefined);
  child.unref();
  return { pid: child.pid };
};

export const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

export const kill = (pid: number): boolean => {
  try {
    process.kill(pid);
    return true;
  } catch {
    return false;
  }
};

const clipboardCommands = (platform: string): readonly (readonly string[])[] => {
  if (platform === 'darwin') {
    return [['pbcopy']];
  }
  if (platform === 'win32') {
    return [['clip']];
  }
  return [['wl-copy'], ['xclip', '-selection', 'clipboard'], ['xsel', '--clipboard', '--input']];
};

const pipeTo = (command: readonly string[], text: string): Promise<boolean> =>
  new Promise(resolve => {
    const [bin, ...args] = command;
    if (!bin) {
      return resolve(false);
    }
    const child = spawn(bin, args, { stdio: ['pipe', 'ignore', 'ignore'] });
    child.on('error', () => resolve(false));
    child.on('close', code => resolve(code === 0));
    child.stdin.on('error', () => undefined);
    child.stdin.end(text);
  });

export const copyToClipboard =
  (platform: string) =>
  async (text: string): Promise<boolean> =>
    clipboardCommands(platform).reduce<Promise<boolean>>(
      async (prev, cmd) => (await prev) || pipeTo(cmd, text),
      Promise.resolve(false)
    );

export const openUrl =
  (platform: string) =>
  async (url: string): Promise<void> => {
    const [bin, ...args]: string[] =
      platform === 'darwin'
        ? ['open', url]
        : platform === 'win32'
          ? ['cmd', '/c', 'start', '', url]
          : ['xdg-open', url];
    if (!bin) {
      return;
    }
    const child = spawn(bin, args, { detached: true, stdio: 'ignore' });
    child.on('error', () => undefined);
    child.unref();
  };

export const fileExists = (path: string): Promise<boolean> =>
  access(path).then(
    () => true,
    () => false
  );
