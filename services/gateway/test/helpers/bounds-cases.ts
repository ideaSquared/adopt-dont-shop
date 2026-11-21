// Shared harness for the body-bound tests (ENG-1406): for every listed field
// an over-cap value must get a 400 from schema validation before the handler
// runs, and an at-cap value must get past validation.
//
// The client behind the routes is a stand-in whose every method resolves to
// `{}`. The tests only assert on whether validation let the request through,
// never on what the handler then did with it.

import Fastify, { type FastifyInstance } from 'fastify';
import { expect, it, vi } from 'vitest';

export const BOUND_CAPS = {
  token: 100,
  name: 200,
  shortText: 500,
  longText: 10_000,
  email: 254,
  phone: 32,
  jsonBlob: 100_000,
} as const;

export type BoundKind = keyof typeof BOUND_CAPS;

export type BoundsCase = {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  // A body that passes validation untouched; each field is overwritten in a copy.
  valid: Record<string, unknown>;
  // Dotted path into `valid` (array indexes are numeric segments) and its cap.
  fields: ReadonlyArray<readonly [path: string, kind: BoundKind]>;
};

export const makeAnyClient = <Client>(): Client =>
  // Test-only stand-in: every client method is a mock resolving to `{}`, so the
  // concrete client type cannot be expressed structurally.
  new Proxy(
    {},
    {
      get: (_target, method) => (method === 'then' ? undefined : vi.fn().mockResolvedValue({})),
    }
  ) as Client;

const withValueAt = (
  body: Record<string, unknown>,
  path: string,
  value: string
): Record<string, unknown> => {
  const copy: Record<string, unknown> = structuredClone(body);
  const segments = path.split('.');
  const last = segments[segments.length - 1];
  const parent = segments
    .slice(0, -1)
    .reduce<
      Record<string, unknown>
    >((node, segment) => (node[segment] ?? (node[segment] = {})) as Record<string, unknown>, copy);
  parent[last] = value;
  return copy;
};

export type BoundsHarness = {
  app: FastifyInstance;
  // Number of requests that got past validation into a handler.
  handlerRuns: () => number;
};

// Builds an app whose preHandler hook (it runs only after body validation
// passed) counts requests, so a test can tell a validation 400 from a 400 the
// handler itself sends. The route response schemas strip Fastify's own
// validation error fields, so the status code alone is ambiguous.
export const createBoundsHarness = async (
  register: (app: FastifyInstance) => Promise<void>
): Promise<BoundsHarness> => {
  const app = Fastify({ logger: false });
  let runs = 0;
  app.addHook('preHandler', async () => {
    runs += 1;
  });
  await register(app);
  return { app, handlerRuns: () => runs };
};

export const describeBounds = (
  getHarness: () => BoundsHarness,
  cases: readonly BoundsCase[]
): void => {
  // Writes are rate limited per IP; a fresh address per request keeps the
  // limiter out of the way.
  let nextAddress = 0;
  const passesValidation = async (c: BoundsCase, payload: Record<string, unknown>) => {
    const { app, handlerRuns } = getHarness();
    nextAddress += 1;
    const before = handlerRuns();
    const res = await app.inject({
      method: c.method,
      url: c.url,
      payload,
      remoteAddress: `10.${(nextAddress >> 16) & 255}.${(nextAddress >> 8) & 255}.${nextAddress & 255}`,
    });
    return { reachedHandler: handlerRuns() > before, statusCode: res.statusCode };
  };

  cases.forEach(c => {
    it(`${c.method} ${c.url} accepts its baseline body`, async () => {
      expect((await passesValidation(c, c.valid)).reachedHandler).toBe(true);
    });

    c.fields.forEach(([path, kind]) => {
      const cap = BOUND_CAPS[kind];
      it(`${c.method} ${c.url} accepts ${path} at ${cap} characters`, async () => {
        const res = await passesValidation(c, withValueAt(c.valid, path, 'a'.repeat(cap)));
        expect(res.reachedHandler).toBe(true);
      });
      it(`${c.method} ${c.url} rejects ${path} over ${cap} characters with 400`, async () => {
        const res = await passesValidation(c, withValueAt(c.valid, path, 'a'.repeat(cap + 1)));
        expect(res).toEqual({ reachedHandler: false, statusCode: 400 });
      });
    });
  });
};
