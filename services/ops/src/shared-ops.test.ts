import { describe, expect, it } from 'vitest';

import { AuthV1, PetsV1, PROTO_SCHEMA } from '@adopt-dont-shop/proto';
import type { OpsEnv } from '@adopt-dont-shop/ops-contract';

import { unlockCreatedEvent } from './events.js';
import { buildSharedCommands } from './shared-ops.js';
import { jsonResponse, makeFakeFetch, makeHarness, type HarnessOptions } from './test-support.js';

const USER = 'https://api.github.com/user';
const MEMBER = 'https://api.github.com/orgs/acme/teams/ops/memberships/octo';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const PET_ID = '11111111-1111-4111-8111-111111111111';

// GitHub as seen by tokens: `good` is a team member, `outsider` is not, anything else is rejected.
const github = () =>
  makeFakeFetch({
    [USER]: call => {
      const token = call.headers.authorization;
      if (token === 'Bearer good') return jsonResponse({ login: 'octo', id: 42, name: 'Octo Cat' });
      if (token === 'Bearer outsider') return jsonResponse({ login: 'octo', id: 42, name: null });
      return jsonResponse({ message: 'Bad credentials' }, 401);
    },
    [MEMBER]: call =>
      call.headers.authorization === 'Bearer good'
        ? jsonResponse({ state: 'active' })
        : jsonResponse({ message: 'Not Found' }, 404),
  });

const setup = (opts: HarnessOptions = {}) => {
  const fake = github();
  const h = makeHarness({ authMode: 'github', fetchFn: fake.fetchFn, ...opts });
  const ops = (method: string, path: string, token?: string, payload?: unknown) =>
    h.app.inject({
      method: method as 'GET' | 'POST',
      url: `/ops/v1${path}`,
      headers: {
        ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
        ...(payload === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }),
    });
  const invoke = (command: string, args: object, mode: 'run' | 'preview', token = 'good') =>
    ops('POST', '/invoke', token, { command, args, mode });
  return { ...h, ops, invoke };
};

const userScript = () =>
  AuthV1.AdminGetUserResponse.fromPartial({
    user: { userId: USER_ID, email: 'jo@example.com', firstName: 'Jo', emailVerified: true },
  });

type CatalogBody = { product: string; environment: string; commands: { id: string }[] };

describe('authorisation', () => {
  it('requires a token for the catalog', async () => {
    const res = await setup().ops('GET', '/catalog');
    expect(res.statusCode).toBe(401);
  });

  it('serves the catalog to an active team member', async () => {
    const res = await setup().ops('GET', '/catalog', 'good');
    expect(res.statusCode).toBe(200);
    const body = res.json<CatalogBody>();
    expect(body).toMatchObject({ product: 'adopt-dont-shop', environment: 'dev' });
    expect(body.commands.map(c => c.id)).toContain('pets.get');
  });

  it('refuses a GitHub user who is not on the team', async () => {
    const h = setup();
    expect((await h.ops('GET', '/catalog', 'outsider')).statusCode).toBe(403);
    expect((await h.invoke('pets.get', { petId: PET_ID }, 'run', 'outsider')).statusCode).toBe(403);
    expect(h.grpc.calls).toHaveLength(0);
  });

  it('refuses a token GitHub rejects', async () => {
    expect((await setup().ops('GET', '/catalog', 'junk')).statusCode).toBe(401);
  });

  it('in local mode accepts any token, as local login does', async () => {
    const h = setup({ authMode: 'local' });
    expect((await h.ops('GET', '/catalog', 'gho_whatever')).statusCode).toBe(200);
  });
});

describe('reads', () => {
  it('runs through the existing invoke path and keeps masked fields masked', async () => {
    const h = setup({ grpc: userScript });
    const res = await h.invoke('auth.admin-get-user', { userId: USER_ID }, 'run');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      command: 'auth.admin-get-user',
      mode: 'run',
      result: { user: { userId: USER_ID, email: { $hidden: true }, emailVerified: true } },
    });
    expect(res.body).not.toContain('jo@example.com');
    const call = h.grpc.calls[0];
    expect(call.headers['x-user-permissions']).toBe('admin.users.read');
    expect(call.headers['x-principal-token']).toBeTruthy();
  });

  it('does not apply an unlock the operator holds', async () => {
    const h = setup({ grpc: userScript });
    await h.invoke('auth.admin-get-user', { userId: USER_ID }, 'run');
    const operatorId = h.store.accessLog[0].operatorId;
    const unlockId = '33333333-3333-4333-8333-333333333333';
    const reason = 'investigating a report';
    await h.store.createUnlock(
      {
        unlockId,
        operatorId,
        subjectType: 'any',
        subjectId: null,
        reason,
        ticket: 'ADS-1',
        createdAt: h.clock.now,
        expiresAt: new Date(h.clock.now.getTime() + 60_000),
      },
      unlockCreatedEvent({
        operatorId,
        unlockId,
        subjectType: 'any',
        subjectId: null,
        ticket: 'ADS-1',
        ttlMinutes: 1,
        reason,
        now: h.clock.now,
      })
    );
    const res = await h.invoke('auth.admin-get-user', { userId: USER_ID }, 'run');
    expect(res.body).not.toContain('jo@example.com');
    expect(h.store.accessLog.at(-1)?.unlockId).toBeNull();
  });

  it('answers an unknown field with invalid_argument', async () => {
    const res = await setup().invoke('pets.get', { petId: PET_ID, nope: 1 }, 'run');
    expect(res.statusCode).toBe(400);
  });
});

describe('writes', () => {
  const rollback = () => PetsV1.UpdatePetStatusResponse.fromPartial({});
  const args = { petId: PET_ID, toStatus: 'PET_STATUS_ADOPTED' };
  const actions = (h: ReturnType<typeof setup>) =>
    h.store.events.map(e => (e.payload as { action: string }).action);

  it('previews with the dry run and changes nothing', async () => {
    const h = setup({ grpc: rollback });
    const res = await h.invoke('pets.update-status', args, 'preview');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ mode: 'preview', result: { dryRun: 'rollback' } });
    expect(h.grpc.calls).toHaveLength(1);
    expect(h.grpc.calls[0].headers['x-dry-run']).toBe('1');
    expect(actions(h)).not.toContain('write.executed');
  });

  it('runs a write after its own dry run and audits the operator', async () => {
    const h = setup({ grpc: rollback });
    const res = await h.invoke('pets.update-status', args, 'run');
    expect(res.statusCode).toBe(200);
    expect(h.grpc.calls.map(c => c.headers['x-dry-run'])).toEqual(['1', undefined]);
    expect(actions(h)).toContain('write.executed');

    const executed = h.store.accessLog.find(e => e.mode === 'execute');
    expect(executed).toMatchObject({ rpc: 'pets.UpdateStatus', outcome: 'ok' });
    const event = h.store.events.find(
      e => (e.payload as { action: string }).action === 'write.executed'
    );
    expect(JSON.stringify(event)).toContain(executed?.operatorId);
    const operatorHistory = await h.store.listHistory(executed?.operatorId ?? '', 10);
    expect(operatorHistory).toHaveLength(2);
  });

  it('does not run when the dry run fails', async () => {
    const h = setup({ grpc: rollback, honourDryRun: false });
    const res = await h.invoke('pets.update-status', args, 'run');
    expect(res.statusCode).toBe(500);
    expect(h.grpc.calls).toHaveLength(1);
    expect(actions(h)).not.toContain('write.executed');
  });
});

describe('catalog derivation', () => {
  const idsFor = async (env: OpsEnv) => {
    const res = await setup({ env }).ops('GET', '/catalog', 'good');
    return res.json<{ commands: { id: string; kind: string; dryRun: boolean }[] }>().commands;
  };

  it('names commands <service>.<kebab-case method> and sets kind and dryRun', async () => {
    const commands = await idsFor('dev');
    expect(commands.find(c => c.id === 'pets.update-status')).toMatchObject({
      kind: 'write',
      dryRun: true,
    });
    expect(commands.find(c => c.id === 'pets.get')).toMatchObject({ kind: 'read', dryRun: false });
  });

  it('maps request fields to contract types and drops what cannot be expressed', async () => {
    const res = await setup().ops('GET', '/catalog', 'good');
    const commands = res.json<{
      commands: { id: string; fields: { name: string; type: string; required: boolean }[] }[];
    }>().commands;
    const fields = (id: string) => commands.find(c => c.id === id)?.fields ?? [];
    expect(fields('pets.get')).toMatchObject([{ name: 'petId', type: 'id', required: true }]);
    expect(fields('pets.update-status').find(f => f.name === 'toStatus')?.type).toBe('enum');
    expect(fields('pets.list').find(f => f.name === 'limit')?.type).toBe('number');
    // a PII lookup field is not offered: it would need an unlock
    expect(fields('auth.search-users').map(f => f.name)).not.toContain('search');
  });

  it('leaves out nested requests, demo flows and (in prod) every write', async () => {
    const dev = (await idsFor('dev')).map(c => c.id);
    expect(dev).not.toContain('notifications.broadcast');
    expect(dev.filter(id => id.startsWith('demo.'))).toEqual([]);
    const prod = await idsFor('prod');
    expect(prod.filter(c => c.kind === 'write')).toEqual([]);
    expect(prod.length).toBeGreaterThan(0);
  });

  it('answers an excluded or unknown command with 404', async () => {
    const h = setup();
    expect((await h.invoke('demo.create-rescue', {}, 'run')).statusCode).toBe(404);
    expect((await h.invoke('pets.nope', {}, 'run')).statusCode).toBe(404);
    expect(h.grpc.calls).toHaveLength(0);
  });

  it('builds a valid catalog in every environment and reports why entries are excluded', () => {
    (['dev', 'staging', 'prod'] as const).forEach(env => {
      const h = makeHarness({ env });
      const built = buildSharedCommands(
        {
          env,
          schema: PROTO_SCHEMA,
          invoke: { invoke: async () => Promise.reject(new Error('x')) },
        },
        () => {
          throw new Error('unused');
        }
      );
      expect(built.commands.length).toBeGreaterThan(0);
      expect(built.excluded.every(e => e.reason.length > 0)).toBe(true);
      expect(h.app).toBeDefined();
    });
  });
});

describe('mount', () => {
  it('answers unsupported routes and methods in the contract error shape', async () => {
    const h = setup();
    const res = await h.ops('PUT', '/catalog', 'good');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: { code: 'not_found' } });
  });

  it('answers a malformed body with invalid_argument', async () => {
    const h = setup();
    const res = await h.app.inject({
      method: 'POST',
      url: '/ops/v1/invoke',
      headers: { authorization: 'Bearer good', 'content-type': 'application/json' },
      payload: '{nope',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'invalid_argument' } });
  });

  it('does not need the /v1 expected-environment header', async () => {
    const res = await setup().ops('GET', '/catalog', 'good');
    expect(res.statusCode).toBe(200);
  });
});
