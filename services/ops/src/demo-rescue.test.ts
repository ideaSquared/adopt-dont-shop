import { describe, expect, it } from 'vitest';

import { NewPasswordSchema } from '@adopt-dont-shop/lib.validation';
import { AuthV1, PetsV1, RescueV1 } from '@adopt-dont-shop/proto';
import {
  ErrorResponseSchema,
  InvokeResponseSchema,
  type InvokeResponse,
} from '@adopt-dont-shop/ops-contract';

import type { GrpcCall } from './proto-methods.js';
import { makeHarness, type HarnessOptions } from './test-support.js';

const OWNER_ID = '33333333-3333-4333-8333-333333333333';
const RESCUE_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_USER_ID = '55555555-5555-4555-8555-555555555555';

const bodyOf = (res: { json: () => unknown }): InvokeResponse =>
  InvokeResponseSchema.parse(res.json());
const errorOf = (res: { json: () => unknown }) => ErrorResponseSchema.parse(res.json()).error;

const setup = async (opts: HarnessOptions = {}) => {
  const h = makeHarness(opts);
  const session = await h.loginLocal();
  const invoke = (payload: Record<string, unknown>) => h.post(session.token, '/v1/invoke', payload);
  const previewThenExecute = async (rpc: string, request: Record<string, unknown>) => {
    const plan = bodyOf(await invoke({ rpc, request }));
    const planId = plan.kind === 'plan' ? plan.planId : '';
    return invoke({ rpc, request, mode: 'execute', planId });
  };
  return { ...h, session, invoke, previewThenExecute };
};

// Downstream behaviour for a successful create; `override` replaces one rpc.
const createScript =
  (override: Record<string, (call: GrpcCall) => unknown> = {}) =>
  (call: GrpcCall): unknown => {
    const custom = override[call.method.rpc];
    if (custom) {
      return custom(call);
    }
    switch (call.method.rpc) {
      case 'auth.RegisterRescueOwner':
        return AuthV1.RegisterRescueOwnerResponse.fromPartial({ user: { userId: OWNER_ID } });
      case 'auth.AdminUpdateUser':
        return AuthV1.AdminUpdateUserResponse.fromPartial({ user: { userId: OWNER_ID } });
      case 'rescue.RegisterRescue':
        return RescueV1.RegisterRescueResponse.fromPartial({ rescue: { rescueId: RESCUE_ID } });
      case 'rescue.Verify':
        return RescueV1.VerifyRescueResponse.fromPartial({ rescue: { rescueId: RESCUE_ID } });
      case 'pets.Create':
        return PetsV1.CreatePetResponse.fromPartial({
          pet: { petId: `pet-${String(Reflect.get(Object(call.request), 'name'))}` },
        });
      default:
        throw new Error(`unexpected ${call.method.rpc}`);
    }
  };

const requestOf = (h: Awaited<ReturnType<typeof setup>>, rpc: string) => {
  const call = h.grpc.calls.find(c => c.rpc === rpc);
  return JSON.parse(JSON.stringify(call?.request ?? null)) as Record<string, unknown>;
};

describe('demo create-rescue', () => {
  it('is listed in the dev and staging catalogs but not in prod', async () => {
    const commandsIn = async (env: 'dev' | 'staging' | 'prod') => {
      const h = await setup({ env });
      const res = await h.inject({
        method: 'GET',
        url: '/v1/catalog',
        headers: { authorization: `Bearer ${h.session.token}` },
      });
      const demo = res
        .json<{ services: { name: string; methods: { command: string }[] }[] }>()
        .services.find(s => s.name === 'demo');
      return demo?.methods.map(m => m.command) ?? [];
    };
    expect(await commandsIn('dev')).toEqual(
      expect.arrayContaining(['create-rescue', 'delete-rescue'])
    );
    expect(await commandsIn('staging')).toEqual(
      expect.arrayContaining(['create-rescue', 'delete-rescue'])
    );
    expect(await commandsIn('prod')).toEqual([]);
  });

  it('is refused in prod before anything runs', async () => {
    const h = await setup({ env: 'prod', grpc: createScript() });
    const res = await h.invoke({ rpc: 'demo.CreateRescue', request: {} });
    expect(errorOf(res).code).toBe('NOT_ENABLED');
    expect(errorOf(res).message).toContain('prod');
    expect(h.grpc.calls).toHaveLength(0);
    expect(h.store.plans.size).toBe(0);
  });

  it('previews as a plan without calling any service', async () => {
    const h = await setup({ grpc: createScript() });
    const plan = bodyOf(await h.invoke({ rpc: 'demo.CreateRescue', request: { petCount: 2 } }));
    expect(plan).toMatchObject({ kind: 'plan', dryRun: 'preview-only', response: null });
    expect(h.grpc.calls).toHaveLength(0);
  });

  it('creates an active owner, a verified rescue and sample pets, showing the login once', async () => {
    const h = await setup({ env: 'staging', grpc: createScript() });
    const res = await h.previewThenExecute('demo.CreateRescue', { petCount: 2 });
    const body = bodyOf(res);
    expect(body.kind).toBe('result');
    const result = (body.kind === 'result' ? body.response : {}) as Record<string, unknown>;

    expect(h.grpc.calls.map(c => c.rpc)).toEqual([
      'auth.RegisterRescueOwner',
      'auth.AdminUpdateUser',
      'rescue.RegisterRescue',
      'rescue.Verify',
      'pets.Create',
      'pets.Create',
    ]);

    const owner = requestOf(h, 'auth.RegisterRescueOwner');
    expect(owner.email).toMatch(/^demo-[a-z0-9]{10}@example\.com$/);
    expect(NewPasswordSchema.safeParse(owner.password).success).toBe(true);

    expect(result).toMatchObject({
      rescueId: RESCUE_ID,
      ownerUserId: OWNER_ID,
      ownerEmail: owner.email,
      ownerPassword: owner.password,
      petIds: [expect.stringContaining('pet-'), expect.stringContaining('pet-')],
    });
    expect(String(result.rescueName)).toMatch(/^Demo Rescue /);
    expect(body.hidden).toEqual([]);

    expect(requestOf(h, 'auth.AdminUpdateUser')).toMatchObject({
      userId: OWNER_ID,
      status: AuthV1.UserStatus.USER_STATUS_ACTIVE,
      emailVerified: true,
    });
    expect(requestOf(h, 'rescue.RegisterRescue')).toMatchObject({
      ownerUserId: OWNER_ID,
      rescue: { email: owner.email, country: 'GB' },
    });
    expect(requestOf(h, 'rescue.Verify')).toMatchObject({
      rescueId: RESCUE_ID,
      toStatus: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
    });

    // The password exists only in the execute result: never in the plan, the
    // access log or the audit events.
    const persisted = JSON.stringify({
      log: h.store.accessLog,
      events: h.store.events,
      plans: [...h.store.plans.values()],
    });
    expect(persisted).not.toContain(String(owner.password));
  });

  it('gives each step only the permissions it needs', async () => {
    const h = await setup({ grpc: createScript() });
    await h.previewThenExecute('demo.CreateRescue', { petCount: 1 });
    const headersOf = (rpc: string) => h.grpc.calls.find(c => c.rpc === rpc)?.headers ?? {};

    expect(headersOf('auth.RegisterRescueOwner')['x-user-permissions']).toBe('');
    expect(headersOf('auth.AdminUpdateUser')['x-user-permissions']).toBe('admin.users.update');
    expect(headersOf('rescue.RegisterRescue')['x-user-permissions']).toBe('');
    expect(headersOf('rescue.Verify')['x-user-permissions']).toBe('admin.security.manage');
    expect(headersOf('pets.Create')['x-user-permissions']).toBe('pets.create,pets.manage:any');
    expect(headersOf('pets.Create')['x-rescue-id']).toBe(RESCUE_ID);
    expect(headersOf('rescue.Verify')['x-rescue-id']).toBeUndefined();
  });

  it('names what it already created when a later step fails', async () => {
    const h = await setup({
      grpc: createScript({
        'rescue.Verify': () => {
          throw Object.assign(new Error('boom'), { code: 13, details: 'boom' });
        },
      }),
    });
    const res = await h.previewThenExecute('demo.CreateRescue', {});
    const error = errorOf(res);
    expect(error.hint).toContain(RESCUE_ID);
    expect(error.hint).toContain(OWNER_ID);
    expect(error.hint).toContain('pnpm ops demo delete-rescue');
    expect(h.grpc.calls.map(c => c.rpc)).not.toContain('pets.Create');
  });

  it('fails when the generated email already has an account', async () => {
    const h = await setup({
      grpc: createScript({ 'auth.RegisterRescueOwner': () => ({}) }),
    });
    const res = await h.previewThenExecute('demo.CreateRescue', {});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(errorOf(res).message).toContain('owner account');
    expect(h.grpc.calls).toHaveLength(1);
  });

  it('rejects more than ten pets before planning', async () => {
    const h = await setup({ grpc: createScript() });
    const res = await h.invoke({ rpc: 'demo.CreateRescue', request: { petCount: 11 } });
    expect(errorOf(res).code).toBe('INVALID_ARGUMENT');
    expect(h.store.plans.size).toBe(0);
  });
});

describe('demo delete-rescue', () => {
  const DEMO_EMAIL = 'demo-abcdef1234@example.com';

  // No rescue.Get: for an operator principal (no roles) the rescue service
  // zeroes every field, so the rescue's own email cannot identify a demo rescue.
  const deleteScript =
    (userEmails: Record<string, string>) =>
    (call: GrpcCall): unknown => {
      const request = JSON.parse(JSON.stringify(call.request)) as Record<string, unknown>;
      switch (call.method.rpc) {
        case 'pets.List':
          return request.cursor === undefined
            ? PetsV1.ListPetsResponse.fromPartial({
                pets: [{ petId: 'pet-1' }],
                nextCursor: 'page-2',
              })
            : PetsV1.ListPetsResponse.fromPartial({ pets: [{ petId: 'pet-2' }] });
        case 'pets.Delete':
          return PetsV1.DeletePetResponse.fromPartial({});
        case 'rescue.Delete':
          return RescueV1.DeleteRescueResponse.fromPartial({ rescue: { rescueId: RESCUE_ID } });
        case 'rescue.ListStaffMembers':
          return RescueV1.ListStaffMembersResponse.fromPartial({
            staffMembers: Object.keys(userEmails).map(userId => ({ userId })),
          });
        case 'auth.AdminGetUser':
          return AuthV1.AdminGetUserResponse.fromPartial({
            user: { userId: String(request.userId), email: userEmails[String(request.userId)] },
          });
        case 'auth.DeactivateUser':
          return AuthV1.DeactivateUserResponse.fromPartial({});
        default:
          throw new Error(`unexpected ${call.method.rpc}`);
      }
    };

  it('refuses a rescue with any staff member who is not a demo account, and changes nothing', async () => {
    const h = await setup({
      grpc: deleteScript({ [OWNER_ID]: DEMO_EMAIL, [OTHER_USER_ID]: 'jo@real.org' }),
    });
    const res = await h.previewThenExecute('demo.DeleteRescue', { rescueId: RESCUE_ID });
    expect(errorOf(res).code).toBe('INVALID_ARGUMENT');
    expect(errorOf(res).message).toContain('not a demo rescue');
    expect(h.grpc.calls.map(c => c.rpc)).toEqual([
      'rescue.ListStaffMembers',
      'auth.AdminGetUser',
      'auth.AdminGetUser',
    ]);
  });

  it('refuses a rescue with no staff, and changes nothing', async () => {
    const h = await setup({ grpc: deleteScript({}) });
    const res = await h.previewThenExecute('demo.DeleteRescue', { rescueId: RESCUE_ID });
    expect(errorOf(res).message).toContain('not a demo rescue');
    expect(h.grpc.calls.map(c => c.rpc)).toEqual(['rescue.ListStaffMembers']);
  });

  it('deletes every pet and the rescue, then deactivates its demo staff accounts', async () => {
    const h = await setup({ grpc: deleteScript({ [OWNER_ID]: DEMO_EMAIL }) });
    const body = bodyOf(await h.previewThenExecute('demo.DeleteRescue', { rescueId: RESCUE_ID }));
    expect(body.kind === 'result' && body.response).toEqual({
      rescueId: RESCUE_ID,
      deletedPetIds: ['pet-1', 'pet-2'],
      deactivatedUserIds: [OWNER_ID],
    });
    expect(h.grpc.calls.map(c => c.rpc)).toEqual([
      'rescue.ListStaffMembers',
      'auth.AdminGetUser',
      'pets.List',
      'pets.List',
      'pets.Delete',
      'pets.Delete',
      'auth.DeactivateUser',
      'rescue.Delete',
    ]);
    const headersOf = (rpc: string) => h.grpc.calls.find(c => c.rpc === rpc)?.headers ?? {};
    expect(headersOf('pets.Delete')['x-user-permissions']).toBe('pets.delete,pets.manage:any');
    expect(headersOf('pets.Delete')['x-rescue-id']).toBe(RESCUE_ID);
    expect(headersOf('rescue.Delete')['x-user-permissions']).toBe('admin.security.manage');
    expect(headersOf('auth.DeactivateUser')['x-user-permissions']).toBe('admin.users.deactivate');
    expect(requestOf(h, 'auth.DeactivateUser')).toMatchObject({ userId: OWNER_ID });
  });

  it('leaves the rescue in place when deactivating an account fails, so a re-run can finish', async () => {
    const script = deleteScript({ [OWNER_ID]: DEMO_EMAIL });
    const h = await setup({
      grpc: (call: GrpcCall): unknown => {
        if (call.method.rpc === 'auth.DeactivateUser') {
          throw Object.assign(new Error('auth unavailable'), { code: 14 });
        }
        return script(call);
      },
    });
    const res = await h.previewThenExecute('demo.DeleteRescue', { rescueId: RESCUE_ID });
    expect(errorOf(res).code).not.toBe('OK');
    expect(h.grpc.calls.map(c => c.rpc)).not.toContain('rescue.Delete');
  });

  it('is refused in prod', async () => {
    const h = await setup({ env: 'prod', grpc: deleteScript({}) });
    const res = await h.invoke({ rpc: 'demo.DeleteRescue', request: { rescueId: RESCUE_ID } });
    expect(errorOf(res).code).toBe('NOT_ENABLED');
    expect(h.grpc.calls).toHaveLength(0);
  });
});
