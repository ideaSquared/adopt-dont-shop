import type { FetchFn } from './client.js';
import type { Store } from './store.js';
import type { Theme } from './ui/theme.js';

export type SelectOption = {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
};

export type SpinnerHandle = {
  readonly start: (message: string) => void;
  readonly message: (message: string) => void;
  readonly stop: (message: string) => void;
};

// Everything interactive goes through this so tests can script answers.
export type Prompts = {
  readonly intro: (title: string) => void;
  readonly outro: (message: string) => void;
  readonly note: (message: string, title?: string) => void;
  readonly select: (options: {
    readonly message: string;
    readonly options: readonly SelectOption[];
    readonly initialValue?: string;
  }) => Promise<string>;
  readonly text: (options: {
    readonly message: string;
    readonly placeholder?: string;
    readonly initialValue?: string;
    readonly validate?: (value: string) => string | undefined;
  }) => Promise<string>;
  readonly confirm: (options: {
    readonly message: string;
    readonly initialValue?: boolean;
  }) => Promise<boolean>;
  readonly spinner: () => SpinnerHandle;
  readonly log: {
    readonly info: (message: string) => void;
    readonly success: (message: string) => void;
    readonly warn: (message: string) => void;
    readonly error: (message: string) => void;
  };
};

export type ExecResult = {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
};

// The impure edges. bin.ts builds the real one; tests build fakes.
export type Ctx = {
  readonly version: string;
  readonly fetch: FetchFn;
  readonly now: () => number;
  readonly sleep: (ms: number) => Promise<void>;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly platform: string;
  readonly stdoutTTY: boolean;
  readonly stdinTTY: boolean;
  readonly columns: number;
  readonly out: (text: string) => void;
  readonly err: (text: string) => void;
  readonly theme: Theme;
  readonly prompts: Prompts;
  readonly store: Store;
  readonly exec: (command: string, args: readonly string[]) => Promise<ExecResult>;
  readonly spawnDetached: (command: string, args: readonly string[]) => { readonly pid?: number };
  readonly isAlive: (pid: number) => boolean;
  readonly kill: (pid: number) => boolean;
  readonly copyToClipboard: (text: string) => Promise<boolean>;
  readonly openUrl: (url: string) => Promise<void>;
  readonly defaultLogin: () => Promise<string>;
  readonly fileExists: (path: string) => Promise<boolean>;
  readonly homeDir: string;
  readonly repoRoot: string;
  readonly timeZone?: string;
};

export const isInteractive = (ctx: Ctx): boolean => ctx.stdinTTY && ctx.stdoutTTY;
