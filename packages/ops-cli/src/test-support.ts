import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  CatalogField,
  CatalogResponse,
  InvokeResponse,
  Session,
} from '@adopt-dont-shop/ops-contract';
import { buildIndex } from './catalog.js';
import type { Ctx, Prompts } from './ctx.js';
import { createStore } from './store.js';
import { createTheme, stripAnsi } from './ui/theme.js';

// Shared fixtures and fakes for tests. Not part of the shipped CLI.

const PET = 'adopt_dont_shop.pets.v1';

const field = (jsonName: string, extra: Partial<CatalogField>): CatalogField => ({
  name: jsonName.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`),
  jsonName,
  kind: 'scalar',
  repeated: false,
  optional: false,
  sensitivity: null,
  ...extra,
});

export const sampleCatalog: CatalogResponse = {
  env: 'dev',
  services: [
    {
      name: 'pets',
      fullName: `${PET}.PetService`,
      methods: [
        {
          command: 'list',
          rpc: 'pets.List',
          kind: 'read',
          dryRun: null,
          summary: 'List pets',
          inputType: `${PET}.ListRequest`,
          outputType: `${PET}.ListResponse`,
          piiRequestFields: [],
        },
        {
          command: 'update-status',
          rpc: 'pets.UpdateStatus',
          kind: 'write',
          dryRun: 'rollback',
          summary: 'Change status',
          inputType: `${PET}.UpdateRequest`,
          outputType: `${PET}.ListResponse`,
          piiRequestFields: [],
        },
        {
          command: 'find-owner',
          rpc: 'pets.FindOwner',
          kind: 'read',
          dryRun: null,
          summary: 'Find by email',
          inputType: `${PET}.FindRequest`,
          outputType: `${PET}.ListResponse`,
          piiRequestFields: ['owner_email'],
        },
      ],
    },
  ],
  messages: {
    [`${PET}.ListRequest`]: {
      fullName: `${PET}.ListRequest`,
      fields: [
        field('status', { kind: 'enum', typeName: `${PET}.PetStatus`, optional: true }),
        field('limit', { scalarType: 'int32', optional: true }),
        field('tags', { scalarType: 'string', repeated: true, optional: true }),
        field('includeArchived', { scalarType: 'bool', optional: true }),
        field('filter', { kind: 'message', typeName: `${PET}.Filter`, optional: true }),
      ],
    },
    [`${PET}.UpdateRequest`]: {
      fullName: `${PET}.UpdateRequest`,
      fields: [
        field('petId', { scalarType: 'string' }),
        field('status', { kind: 'enum', typeName: `${PET}.PetStatus` }),
        field('notifyAdopter', { scalarType: 'bool', optional: true }),
      ],
    },
    [`${PET}.FindRequest`]: {
      fullName: `${PET}.FindRequest`,
      fields: [field('ownerEmail', { scalarType: 'string', sensitivity: 'PII', optional: true })],
    },
    [`${PET}.Filter`]: { fullName: `${PET}.Filter`, fields: [] },
    [`${PET}.ListResponse`]: {
      fullName: `${PET}.ListResponse`,
      fields: [
        field('pets', { kind: 'message', typeName: `${PET}.Pet`, repeated: true }),
        field('total', { scalarType: 'int32' }),
      ],
    },
    [`${PET}.Pet`]: {
      fullName: `${PET}.Pet`,
      fields: [
        field('petId', { scalarType: 'string' }),
        field('name', { scalarType: 'string' }),
        field('ownerEmail', { scalarType: 'string', sensitivity: 'PII' }),
      ],
    },
  },
  enums: {
    [`${PET}.PetStatus`]: {
      fullName: `${PET}.PetStatus`,
      values: ['UNSPECIFIED', 'AVAILABLE', 'ADOPTED'].map((n, number) => ({
        name: `PET_STATUS_${n}`,
        number,
      })),
    },
  },
};

export const sampleIndex = buildIndex(sampleCatalog);

export const PET_ID = '0b1c2d3e-0000-4000-8000-000000000001';
export const PLAN_ID = '11111111-1111-4111-8111-111111111111';

export const sampleSession = (overrides: Partial<Session> = {}): Session => ({
  token: 'x'.repeat(40),
  expiresAt: '2099-01-01T00:00:00.000Z',
  operator: { operatorId: '22222222-2222-4222-8222-222222222222', login: 'alice', name: null },
  ...overrides,
});

export const resultResponse = (response: unknown, extra: Record<string, unknown> = {}) => ({
  kind: 'result',
  rpc: 'pets.List',
  env: 'dev',
  hidden: [],
  unlockable: null,
  revealedBy: null,
  durationMs: 12,
  response,
  ...extra,
});

export const planResponse = (extra: Record<string, unknown> = {}) => ({
  kind: 'plan',
  rpc: 'pets.UpdateStatus',
  env: 'dev',
  hidden: [],
  unlockable: null,
  revealedBy: null,
  durationMs: 9,
  planId: PLAN_ID,
  expiresAt: '2026-10-12T14:13:00.000Z',
  dryRun: 'rollback',
  request: { petId: PET_ID, status: 'PET_STATUS_ADOPTED' },
  response: { total: 1 },
  warnings: [],
  ...extra,
});

export type Answers = { readonly [kind in 'select' | 'text' | 'confirm']?: (string | boolean)[] };

export type FakePrompts = Prompts & { readonly asked: string[]; readonly logs: string[] };

// Scripted prompts: each call shifts the next answer for that kind.
export const fakePrompts = (answers: Answers = {}): FakePrompts => {
  const queues = {
    select: [...(answers.select ?? [])],
    text: [...(answers.text ?? [])],
    confirm: [...(answers.confirm ?? [])],
  };
  const asked: string[] = [];
  const logs: string[] = [];
  const next = (kind: keyof typeof queues, message: string) => {
    asked.push(message);
    const value = queues[kind].shift();
    if (value === undefined) {
      throw new Error(`No scripted ${kind} answer for: ${message}`);
    }
    return value;
  };
  return {
    asked,
    logs,
    intro: m => void logs.push(m),
    outro: m => void logs.push(m),
    note: m => void logs.push(m),
    select: async o => String(next('select', o.message)),
    text: async o => {
      const v = String(next('text', o.message));
      const problem = o.validate?.(v);
      if (problem) {
        throw new Error(`Scripted answer "${v}" rejected: ${problem}`);
      }
      return v;
    },
    confirm: async o => Boolean(next('confirm', o.message)),
    spinner: () => ({
      start: m => void logs.push(m),
      message: () => undefined,
      stop: m => void logs.push(m),
    }),
    log: {
      info: m => void logs.push(m),
      success: m => void logs.push(m),
      warn: m => void logs.push(m),
      error: m => void logs.push(m),
    },
  };
};

export type Route = (req: { method: string; path: string; body: unknown; headers: Headers }) =>
  | {
      status?: number;
      json?: unknown;
      headers?: Record<string, string>;
    }
  | undefined;

export type FakeCtx = Ctx & {
  readonly stdout: () => string;
  readonly stderr: () => string;
  readonly requests: { method: string; path: string; body: unknown }[];
  readonly prompts: FakePrompts;
  readonly clock: { now: number };
};

export const makeCtx = async (
  options: {
    readonly tty?: boolean;
    readonly answers?: Answers;
    readonly routes?: Route;
    readonly env?: Record<string, string>;
    readonly columns?: number;
    readonly color?: boolean;
  } = {}
): Promise<FakeCtx> => {
  const dir = await mkdtemp(join(tmpdir(), 'ads-ops-test-'));
  const out: string[] = [];
  const err: string[] = [];
  const requests: FakeCtx['requests'] = [];
  const clock = { now: Date.parse('2026-10-12T14:00:00.000Z') };
  const prompts = fakePrompts(options.answers);
  const fetchFn: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    requests.push({ method, path: url.pathname + url.search, body });
    const handled = options.routes?.({
      method,
      path: url.pathname + url.search,
      body,
      headers: new Headers(init?.headers),
    });
    if (!handled) {
      throw new TypeError('fetch failed');
    }
    const payload = handled.status === 204 ? null : JSON.stringify(handled.json ?? {});
    return new Response(payload, {
      status: handled.status ?? 200,
      headers: { 'content-type': 'application/json', ...handled.headers },
    });
  };
  const tty = options.tty ?? false;
  return {
    version: '9.9.9',
    fetch: fetchFn,
    now: () => clock.now,
    sleep: async ms => {
      clock.now += ms;
    },
    env: options.env ?? {},
    platform: 'linux',
    stdoutTTY: tty,
    stdinTTY: tty,
    columns: options.columns ?? 100,
    out: t => void out.push(t),
    err: t => void err.push(t),
    theme: createTheme({ color: options.color ?? false, unicode: true }),
    prompts,
    store: createStore(dir),
    exec: async () => ({ code: 0, stdout: '', stderr: 'OpenSSH_9.0' }),
    spawnDetached: () => ({ pid: 4242 }),
    isAlive: () => true,
    kill: () => true,
    copyToClipboard: async () => true,
    openUrl: async () => undefined,
    defaultLogin: async () => 'Alice Example',
    fileExists: async () => true,
    homeDir: '/home/test',
    repoRoot: '/repo',
    timeZone: 'UTC',
    stdout: () => stripAnsi(out.join('')),
    stderr: () => stripAnsi(err.join('')),
    requests,
    clock,
  };
};

export const json = (body: unknown, status = 200) => ({ status, json: body });

export const apiError = (status: number, code: string, message: string, hint?: string) => ({
  status,
  json: { error: { code, message, ...(hint ? { hint } : {}) } },
});

export type { InvokeResponse };
