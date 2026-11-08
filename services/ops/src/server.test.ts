import { describe, expect, it } from 'vitest';

import { AuthV1, NotificationsV1, PetsV1 } from '@adopt-dont-shop/proto';
import {
  ErrorResponseSchema,
  InvokeResponseSchema,
  type InvokeResponse,
} from '@adopt-dont-shop/ops-contract';

import { verifyChain } from './access-chain.js';
import { jsonResponse, makeFakeFetch, makeHarness, type HarnessOptions } from './test-support.js';

const PET_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';

const statusRequest = { petId: PET_ID, toStatus: 'PET_STATUS_ADOPTED' };

const userScript = () =>
  AuthV1.AdminGetUserResponse.fromPartial({
    user: { userId: USER_ID, email: 'jo@example.com', firstName: 'Jo', emailVerified: true },
  });

const setup = async (opts: HarnessOptions = {}) => {
  const h = makeHarness(opts);
  const session = await h.loginLocal();
  const invoke = (payload: Record<string, unknown>) => h.post(session.token, '/v1/invoke', payload);
  return { ...h, session, invoke };
};

const bodyOf = (res: { json: () => unknown }): InvokeResponse =>
  InvokeResponseSchema.parse(res.json());
const errorOf = (res: { json: () => unknown }) => ErrorResponseSchema.parse(res.json()).error;

describe('authentication', () => {
  it('rejects unauthenticated callers with a hint', async () => {
    const h = makeHarness();
    const res = await h.app.inject({ method: 'GET', url: '/v1/whoami' });
    expect(res.statusCode).toBe(401);
    expect(errorOf(res)).toMatchObject({
      code: 'UNAUTHENTICATED',
      hint: expect.stringContaining('login'),
    });
  });

  it('rejects unknown tokens and revoked sessions', async () => {
    const h = makeHarness();
    const bad = await h.app.inject({
      method: 'GET',
      url: '/v1/whoami',
      headers: { authorization: 'Bearer nope' },
    });
    expect(bad.statusCode).toBe(401);

    const { token } = await h.loginLocal();
    const out = await h.post(token, '/v1/logout', {});
    expect(out.statusCode).toBe(204);
    const after = await h.app.inject({
      method: 'GET',
      url: '/v1/whoami',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(after.statusCode).toBe(401);
  });

  it('rejects expired sessions', async () => {
    const h = makeHarness();
    const { token } = await h.loginLocal();
    h.clock.now = new Date('2026-01-02T12:00:00.000Z');
    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/whoami',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it('does not register local login outside local mode', async () => {
    const h = makeHarness({ authMode: 'github' });
    const res = await h.app.inject({
      method: 'POST',
      url: '/v1/login/local',
      payload: { login: 'alice' },
    });
    expect(res.statusCode).toBe(404);
    expect(errorOf(res).code).toBe('NOT_FOUND');
  });

  it('whoami reports env, operator and unlocks', async () => {
    const h = makeHarness({ env: 'staging', authMode: 'local' });
    const { token } = await h.loginLocal('bob');
    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/whoami',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.json()).toMatchObject({ env: 'staging', operator: { login: 'bob' }, unlocks: [] });
  });
});

describe('github device flow', () => {
  const DEVICE = 'https://github.com/login/device/code';
  const TOKEN = 'https://github.com/login/oauth/access_token';
  const USER = 'https://api.github.com/user';
  const TEAM = 'https://api.github.com/orgs/acme/teams/ops/memberships/octo';

  const flow = (
    token: () => Response,
    membership: () => Response = () => jsonResponse({ state: 'active' })
  ) => {
    const fake = makeFakeFetch({
      [DEVICE]: () =>
        jsonResponse({
          device_code: 'dc',
          user_code: 'ABCD-1234',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 5,
        }),
      [TOKEN]: token,
      [USER]: () => jsonResponse({ login: 'octo', id: 42, name: 'Octo Cat' }),
      [TEAM]: membership,
    });
    return { fake, h: makeHarness({ authMode: 'github', fetchFn: fake.fetchFn }) };
  };
  const poll = (h: ReturnType<typeof makeHarness>) =>
    h.app.inject({ method: 'POST', url: '/v1/login/poll', payload: { deviceCode: 'dc' } });

  it('starts a device login', async () => {
    const { h } = flow(() => jsonResponse({}));
    const res = await h.app.inject({ method: 'POST', url: '/v1/login/start' });
    expect(res.json()).toMatchObject({ userCode: 'ABCD-1234', interval: 5, expiresIn: 900 });
  });

  it('creates a session for an active team member and discards the GitHub token', async () => {
    const { h, fake } = flow(() => jsonResponse({ access_token: 'gho_secret' }));
    const res = await poll(h);
    const body = res.json<{
      status: string;
      session: { token: string; operator: { login: string } };
    }>();
    expect(body.status).toBe('ok');
    expect(body.session.operator.login).toBe('octo');
    expect(JSON.stringify(body)).not.toContain('gho_secret');
    expect(fake.calls.map(c => c.url)).toEqual([TOKEN, USER, TEAM]);
    // The ops session works on its own.
    const who = await h.app.inject({
      method: 'GET',
      url: '/v1/whoami',
      headers: { authorization: `Bearer ${body.session.token}` },
    });
    expect(who.statusCode).toBe(200);
  });

  it('denies users who are not active team members', async () => {
    const { h } = flow(
      () => jsonResponse({ access_token: 't' }),
      () => jsonResponse({ state: 'pending' })
    );
    expect(poll(h).then(r => r.json())).resolves.toMatchObject({ status: 'denied' });
  });

  it('denies users missing from the team (404)', async () => {
    const { h } = flow(
      () => jsonResponse({ access_token: 't' }),
      () => jsonResponse({ message: 'Not Found' }, 404)
    );
    expect((await poll(h)).json()).toMatchObject({
      status: 'denied',
      reason: expect.stringContaining('acme/ops'),
    });
  });

  it('reports pending, slow_down, expired and access_denied', async () => {
    const cases: [string, object][] = [
      ['authorization_pending', { status: 'pending' }],
      ['slow_down', { status: 'slow_down', interval: 10 }],
      ['expired_token', { status: 'expired' }],
      ['access_denied', { status: 'denied' }],
    ];
    for (const [error, expected] of cases) {
      const { h } = flow(() => jsonResponse({ error, interval: 10 }));
      expect((await poll(h)).json()).toMatchObject(expected);
    }
  });

  it('turns a misconfigured OAuth app into INTERNAL with a hint', async () => {
    const { h } = flow(() => jsonResponse({ error: 'device_flow_disabled' }));
    const res = await poll(h);
    expect(res.statusCode).toBe(500);
    expect(errorOf(res).hint).toContain('device flow');
  });
});

describe('invoke: registry and validation', () => {
  it('refuses RPCs outside the registry with NOT_ENABLED', async () => {
    const h = await setup();
    const res = await h.invoke({ rpc: 'pets.Delete', request: { petId: PET_ID } });
    expect(res.statusCode).toBe(403);
    expect(errorOf(res)).toMatchObject({ code: 'NOT_ENABLED', hint: expect.any(String) });
    expect(h.grpc.calls).toHaveLength(0);
    expect(h.store.accessLog.at(-1)).toMatchObject({
      rpc: 'pets.Delete',
      outcome: 'error',
      errorCode: 'NOT_ENABLED',
    });
  });

  it('rejects malformed bodies and unknown request fields', async () => {
    const h = await setup();
    expect((await h.invoke({ rpc: 'nonsense', request: {} })).statusCode).toBe(400);
    const res = await h.invoke({ rpc: 'pets.Get', request: { petId: PET_ID, bogus: 1 } });
    expect(res.statusCode).toBe(400);
    expect(errorOf(res).message).toContain('bogus');
  });

  it('maps downstream gRPC failures onto contract codes', async () => {
    const h = await setup({
      grpc: () => {
        throw Object.assign(new Error('x'), { code: 5, details: 'user jo@example.com not found' });
      },
    });
    const res = await h.invoke({ rpc: 'auth.AdminGetUser', request: { userId: USER_ID } });
    expect(res.statusCode).toBe(404);
    const err = errorOf(res);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).not.toContain('jo@example.com');
  });
});

describe('invoke: reads', () => {
  it('mints a roleless principal with only the registry permissions and returns masked data', async () => {
    const h = await setup({ grpc: userScript });
    const res = await h.invoke({ rpc: 'auth.AdminGetUser', request: { userId: USER_ID } });
    const body = bodyOf(res);
    expect(body.kind).toBe('result');
    expect(body.hidden).toEqual(expect.arrayContaining(['user.email', 'user.firstName']));
    expect(body.unlockable).toEqual({ subjectType: 'user', subjectId: USER_ID });
    expect(JSON.stringify(body)).not.toContain('jo@example.com');
    expect(body.kind === 'result' && body.response).toMatchObject({
      user: { userId: USER_ID, email: { $hidden: true }, emailVerified: true },
    });

    const call = h.grpc.calls[0];
    expect(call.headers['x-user-id']).toBe(h.session.operatorId);
    expect(call.headers['x-user-permissions']).toBe('admin.users.read');
    expect(call.headers['x-principal-token']).toBeTruthy();
    expect(call.headers['x-request-id']).toBeTruthy();
    expect(call.headers['x-dry-run']).toBeUndefined();
  });

  it('pins the principal to the rescue named by the registry scope', async () => {
    const h = await setup({ grpc: () => PetsV1.ListPetsResponse.fromPartial({}) });
    await h.invoke({ rpc: 'pets.List', request: { rescueIdFilter: 'r-1' } });
    expect(h.grpc.calls[0].headers['x-rescue-id']).toBe('r-1');
  });

  it('refuses a PII lookup without an unlock and never calls the service', async () => {
    const h = await setup({ grpc: () => AuthV1.SearchUsersResponse.fromPartial({}) });
    const res = await h.invoke({ rpc: 'auth.SearchUsers', request: { search: 'jo@example.com' } });
    expect(res.statusCode).toBe(403);
    expect(errorOf(res).code).toBe('UNLOCK_REQUIRED');
    expect(h.grpc.calls).toHaveLength(0);
    // Without the PII field it runs.
    const ok = await h.invoke({ rpc: 'auth.SearchUsers', request: { limit: 5 } });
    expect(ok.statusCode).toBe(200);
  });

  it('refuses to answer when the access log cannot be written', async () => {
    const h = await setup({ grpc: userScript });
    h.store.appendAccessLog = async () => {
      throw new Error('db down');
    };
    const res = await h.invoke({ rpc: 'auth.AdminGetUser', request: { userId: USER_ID } });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('userId');
  });

  it('records every invoke in a verifiable hash chain', async () => {
    const h = await setup({ grpc: userScript });
    await h.invoke({ rpc: 'auth.AdminGetUser', request: { userId: USER_ID } });
    await h.invoke({ rpc: 'pets.Delete', request: {} });
    expect(h.store.accessLog).toHaveLength(2);
    expect(verifyChain(h.store.accessLog)).toBe(true);
    const history = await h.app.inject({
      method: 'GET',
      url: '/v1/history?limit=5',
      headers: { authorization: `Bearer ${h.session.token}` },
    });
    expect(history.json().entries).toHaveLength(2);
    expect(history.json().entries[0]).toMatchObject({
      rpc: 'pets.Delete',
      outcome: 'error',
      errorCode: 'NOT_ENABLED',
    });
  });
});

describe('invoke: writes', () => {
  const rollbackScript = () => PetsV1.UpdatePetStatusResponse.fromPartial({});

  const preview = async (h: Awaited<ReturnType<typeof setup>>, request = statusRequest) => {
    const res = await h.invoke({ rpc: 'pets.UpdateStatus', request });
    return bodyOf(res);
  };

  it('previews with a rollback dry run and returns a plan', async () => {
    const h = await setup({ grpc: rollbackScript });
    const plan = await preview(h);
    expect(plan).toMatchObject({ kind: 'plan', dryRun: 'rollback', rpc: 'pets.UpdateStatus' });
    expect(h.grpc.calls[0].headers['x-dry-run']).toBe('1');
    expect(h.grpc.calls[0].headers['x-user-permissions']).toBe('pets.manage:any');
    expect(h.store.plans.size).toBe(1);
    expect(plan.kind === 'plan' && plan.warnings.length).toBeGreaterThan(0);
  });

  it('fails when a rollback dry run is not echoed by the target service', async () => {
    const h = await setup({ grpc: rollbackScript, honourDryRun: false });
    const res = await h.invoke({ rpc: 'pets.UpdateStatus', request: statusRequest });
    expect(res.statusCode).toBe(500);
    expect(errorOf(res)).toMatchObject({
      code: 'INTERNAL',
      message: expect.stringContaining('did not honour dry run'),
    });
    expect(h.store.plans.size).toBe(0);
  });

  it('executes with the plan from an identical preview, once', async () => {
    const h = await setup({ grpc: rollbackScript });
    const plan = await preview(h);
    const planId = plan.kind === 'plan' ? plan.planId : '';
    const run = await h.invoke({
      rpc: 'pets.UpdateStatus',
      request: statusRequest,
      mode: 'execute',
      planId,
    });
    expect(bodyOf(run).kind).toBe('result');
    expect(h.grpc.calls[1].headers['x-dry-run']).toBeUndefined();
    expect(h.store.events.map(e => (e.payload as { action: string }).action)).toContain(
      'write.executed'
    );

    const again = await h.invoke({
      rpc: 'pets.UpdateStatus',
      request: statusRequest,
      mode: 'execute',
      planId,
    });
    expect(errorOf(again).code).toBe('PLAN_EXPIRED');
    expect(h.grpc.calls).toHaveLength(2);
  });

  it('requires a plan to execute', async () => {
    const h = await setup({ grpc: rollbackScript });
    const res = await h.invoke({
      rpc: 'pets.UpdateStatus',
      request: statusRequest,
      mode: 'execute',
    });
    expect(res.statusCode).toBe(428);
    expect(errorOf(res).code).toBe('PLAN_REQUIRED');
    expect(h.grpc.calls).toHaveLength(0);
  });

  it('rejects a plan from a different request, rpc or operator', async () => {
    const h = await setup({ grpc: rollbackScript });
    const plan = await preview(h);
    const planId = plan.kind === 'plan' ? plan.planId : '';
    const other = { ...statusRequest, toStatus: 'PET_STATUS_AVAILABLE' };
    const changed = await h.invoke({
      rpc: 'pets.UpdateStatus',
      request: other,
      mode: 'execute',
      planId,
    });
    expect(changed.statusCode).toBe(409);
    expect(errorOf(changed).code).toBe('PLAN_MISMATCH');

    const bob = await h.loginLocal('bob');
    const stolen = await h.post(bob.token, '/v1/invoke', {
      rpc: 'pets.UpdateStatus',
      request: statusRequest,
      mode: 'execute',
      planId,
    });
    expect(errorOf(stolen).code).toBe('PLAN_MISMATCH');
    expect(h.grpc.calls).toHaveLength(1);
  });

  it('rejects an expired plan', async () => {
    const h = await setup({ grpc: rollbackScript });
    const plan = await preview(h);
    const planId = plan.kind === 'plan' ? plan.planId : '';
    h.clock.now = new Date(h.clock.now.getTime() + 11 * 60_000);
    const res = await h.invoke({
      rpc: 'pets.UpdateStatus',
      request: statusRequest,
      mode: 'execute',
      planId,
    });
    expect(res.statusCode).toBe(410);
    expect(errorOf(res).code).toBe('PLAN_EXPIRED');
  });

  it('requires confirm=prod to execute in prod, without burning the plan', async () => {
    const h = await setup({ env: 'prod', grpc: rollbackScript });
    const plan = await preview(h);
    const planId = plan.kind === 'plan' ? plan.planId : '';
    const base = { rpc: 'pets.UpdateStatus', request: statusRequest, mode: 'execute', planId };
    const refused = await h.invoke(base);
    expect(refused.statusCode).toBe(428);
    expect(errorOf(refused).code).toBe('CONFIRMATION_REQUIRED');
    const ok = await h.invoke({ ...base, confirm: 'prod' });
    expect(ok.statusCode).toBe(200);
  });

  it('sets the native dry_run flag for preview and clears it on execute', async () => {
    const h = await setup({
      grpc: () => NotificationsV1.BroadcastResponse.fromPartial({ targeted: 3 }),
    });
    const request = { title: 'Hi', message: 'Hello', cohort: { userTypes: ['adopter'] } };
    const plan = await bodyOf(await h.invoke({ rpc: 'notifications.Broadcast', request }));
    expect(plan).toMatchObject({ kind: 'plan', dryRun: 'native' });
    expect(h.grpc.calls[0].request).toMatchObject({ dryRun: true });
    expect(h.grpc.calls[0].headers['x-dry-run']).toBeUndefined();

    const planId = plan.kind === 'plan' ? plan.planId : '';
    await h.invoke({
      rpc: 'notifications.Broadcast',
      request: { ...request, dryRun: true },
      mode: 'execute',
      planId,
    });
    expect(h.grpc.calls[1].request).toMatchObject({ dryRun: false });
  });
});

describe('unlocks', () => {
  const createBody = {
    subjectType: 'user',
    subjectId: USER_ID,
    reason: 'Investigating a support complaint',
    ticket: 'ADS-123',
  };

  it('is refused on prod when no Discord webhook is configured', async () => {
    const h = await setup({ env: 'prod' });
    const res = await h.post(h.session.token, '/v1/unlocks', createBody);
    expect(res.statusCode).toBe(503);
    expect(errorOf(res).code).toBe('UNLOCKS_DISABLED');
    expect(h.store.unlocks).toHaveLength(0);
  });

  it('posts a Discord alert, audits creation, and still succeeds if Discord fails', async () => {
    const hook = 'https://discord.example/hook';
    const fake = makeFakeFetch({ [hook]: () => jsonResponse({}, 500) });
    const h = await setup({ env: 'prod', discordWebhookUrl: hook, fetchFn: fake.fetchFn });
    const res = await h.post(h.session.token, '/v1/unlocks', createBody);
    expect(res.statusCode).toBe(201);
    expect(res.json().unlock).toMatchObject({ subjectType: 'user', ticket: 'ADS-123' });
    const alert = JSON.parse(fake.calls[0].body ?? '{}') as { content: string };
    expect(alert.content).toContain('ADS-123');
    expect(alert.content).toContain('prod');
    expect(h.store.events[0]).toMatchObject({
      type: 'ops.actionTaken',
      payload: { action: 'unlock.created' },
    });
  });

  it('validates the request and supports list and revoke', async () => {
    const h = await setup();
    expect(
      (await h.post(h.session.token, '/v1/unlocks', { ...createBody, ticket: 'nope' })).statusCode
    ).toBe(400);
    const created = await h.post(h.session.token, '/v1/unlocks', createBody);
    const id = created.json().unlock.unlockId as string;
    const auth = { authorization: `Bearer ${h.session.token}` };
    const list = await h.app.inject({ method: 'GET', url: '/v1/unlocks', headers: auth });
    expect(list.json().unlocks).toHaveLength(1);
    expect(
      (await h.app.inject({ method: 'DELETE', url: `/v1/unlocks/${id}`, headers: auth })).statusCode
    ).toBe(204);
    expect(
      (await h.app.inject({ method: 'DELETE', url: `/v1/unlocks/${id}`, headers: auth })).statusCode
    ).toBe(404);
    await h.post(h.session.token, '/v1/unlocks', createBody);
    expect(
      (await h.app.inject({ method: 'DELETE', url: '/v1/unlocks', headers: auth })).statusCode
    ).toBe(204);
    expect(
      (await h.app.inject({ method: 'GET', url: '/v1/unlocks', headers: auth })).json().unlocks
    ).toEqual([]);
  });

  it('reveals fields under a matching unlock and logs only their names', async () => {
    const h = await setup({ grpc: userScript });
    const created = await h.post(h.session.token, '/v1/unlocks', createBody);
    const unlockId = created.json().unlock.unlockId as string;

    const body = bodyOf(await h.invoke({ rpc: 'auth.AdminGetUser', request: { userId: USER_ID } }));
    expect(body.hidden).toEqual([]);
    expect(body.revealedBy).toBe(unlockId);
    expect(JSON.stringify(body.kind === 'result' && body.response)).toContain('jo@example.com');

    const row = h.store.accessLog.at(-1);
    expect(row?.revealedFields).toEqual(expect.arrayContaining(['user.email']));
    expect(row?.unlockId).toBe(unlockId);
    expect(JSON.stringify(h.store.accessLog)).not.toContain('jo@example.com');
    const revealed = h.store.events.find(
      e => (e.payload as { action: string }).action === 'pii.revealed'
    );
    expect(JSON.stringify(revealed)).not.toContain('jo@example.com');
    expect(JSON.stringify(revealed)).toContain('user.email');
  });

  it('does not reveal for an unlock scoped to a different subject, but any-unlock allows PII lookups', async () => {
    const h = await setup({ grpc: userScript });
    await h.post(h.session.token, '/v1/unlocks', { ...createBody, subjectId: 'someone-else' });
    const masked = bodyOf(
      await h.invoke({ rpc: 'auth.AdminGetUser', request: { userId: USER_ID } })
    );
    expect(masked.hidden.length).toBeGreaterThan(0);

    const lookup = await h.invoke({ rpc: 'auth.SearchUsers', request: { search: 'jo' } });
    expect(errorOf(lookup).code).toBe('UNLOCK_REQUIRED');
    await h.post(h.session.token, '/v1/unlocks', {
      ...createBody,
      subjectType: 'any',
      subjectId: null,
    });
    const ok = await h.invoke({ rpc: 'auth.SearchUsers', request: { search: 'jo' } });
    expect(ok.statusCode).toBe(200);
  });
});

describe('catalog', () => {
  it('lists registry methods joined with the proto schema', async () => {
    const h = await setup();
    const res = await h.app.inject({
      method: 'GET',
      url: '/v1/catalog',
      headers: { authorization: `Bearer ${h.session.token}` },
    });
    const catalog = res.json();
    const pets = catalog.services.find((s: { name: string }) => s.name === 'pets');
    expect(pets.methods.find((m: { rpc: string }) => m.rpc === 'pets.UpdateStatus')).toMatchObject({
      command: 'update-status',
      kind: 'write',
      dryRun: 'rollback',
    });
    expect(catalog.messages['adopt_dont_shop.pets.v1.UpdatePetStatusRequest']).toBeDefined();
    expect(Object.keys(catalog.enums)).toContain('adopt_dont_shop.pets.v1.PetStatus');
  });
});
