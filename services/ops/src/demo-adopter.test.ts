import { describe, expect, it } from 'vitest';

import { NewPasswordSchema } from '@adopt-dont-shop/lib.validation';
import { AuthV1 } from '@adopt-dont-shop/proto';
import {
  ErrorResponseSchema,
  InvokeResponseSchema,
  type InvokeResponse,
} from '@adopt-dont-shop/ops-contract';

import type { GrpcCall } from './proto-methods.js';
import { makeHarness, type HarnessOptions } from './test-support.js';

const USER_ID = '66666666-6666-4666-8666-666666666666';
const DEMO_EMAIL = 'demo-abcdef1234@example.com';

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

const requestOf = (call: GrpcCall | undefined) =>
  JSON.parse(JSON.stringify(call?.request ?? null)) as Record<string, unknown>;

// Downstream behaviour for a successful create. Search echoes back whatever
// email Register was given, as the real service would.
const createScript = (override: Record<string, (call: GrpcCall) => unknown> = {}) =>
  (() => {
    const registered: { email?: string } = {};
    return (call: GrpcCall): unknown => {
      const custom = override[call.method.rpc];
      if (custom) {
        return custom(call);
      }
      switch (call.method.rpc) {
        case 'auth.Register':
          registered.email = String(requestOf(call).email);
          return AuthV1.RegisterResponse.fromPartial({});
        case 'auth.SearchUsers':
          return AuthV1.SearchUsersResponse.fromPartial({
            users: [
              { userId: 'other', email: `x${registered.email}` },
              { userId: USER_ID, email: registered.email },
            ],
          });
        case 'auth.AdminUpdateUser':
          return AuthV1.AdminUpdateUserResponse.fromPartial({ user: { userId: USER_ID } });
        default:
          throw new Error(`unexpected ${call.method.rpc}`);
      }
    };
  })();

describe('demo create-adopter', () => {
  it('previews as a plan without calling any service', async () => {
    const h = await setup({ grpc: createScript() });
    const plan = bodyOf(await h.invoke({ rpc: 'demo.CreateAdopter', request: {} }));
    expect(plan).toMatchObject({ kind: 'plan', dryRun: 'preview-only', response: null });
    expect(h.grpc.calls).toHaveLength(0);
  });

  it('is refused in prod before anything runs', async () => {
    const h = await setup({ env: 'prod', grpc: createScript() });
    const res = await h.invoke({ rpc: 'demo.CreateAdopter', request: {} });
    expect(errorOf(res).code).toBe('NOT_ENABLED');
    expect(h.grpc.calls).toHaveLength(0);
  });

  it('registers, finds, activates and verifies the adopter, showing the login once', async () => {
    const h = await setup({ env: 'staging', grpc: createScript() });
    const body = bodyOf(await h.previewThenExecute('demo.CreateAdopter', { firstName: 'Ada' }));
    expect(body.kind).toBe('result');
    const result = (body.kind === 'result' ? body.response : {}) as Record<string, unknown>;

    expect(h.grpc.calls.map(c => c.rpc)).toEqual([
      'auth.Register',
      'auth.SearchUsers',
      'auth.AdminUpdateUser',
    ]);
    const register = requestOf(h.grpc.calls[0]);
    expect(register.email).toMatch(/^demo-[a-z0-9]{10}@example\.com$/);
    expect(NewPasswordSchema.safeParse(register.password).success).toBe(true);
    expect(register).toMatchObject({
      firstName: 'Ada',
      termsAccepted: true,
      privacyPolicyAccepted: true,
    });
    expect(requestOf(h.grpc.calls[2])).toMatchObject({
      userId: USER_ID,
      status: AuthV1.UserStatus.USER_STATUS_ACTIVE,
      emailVerified: true,
    });

    expect(result).toMatchObject({
      userId: USER_ID,
      email: register.email,
      password: register.password,
    });
    expect(String(result.nextSteps)).toContain(`pnpm ops demo delete-adopter ${USER_ID}`);
    expect(body.hidden).toEqual([]);

    const persisted = JSON.stringify({
      log: h.store.accessLog,
      events: h.store.events,
      plans: [...h.store.plans.values()],
    });
    expect(persisted).not.toContain(String(register.password));
  });

  it('gives each step only the permissions it needs', async () => {
    const h = await setup({ grpc: createScript() });
    await h.previewThenExecute('demo.CreateAdopter', {});
    const permissionsOf = (rpc: string) =>
      h.grpc.calls.find(c => c.rpc === rpc)?.headers['x-user-permissions'];
    expect(permissionsOf('auth.Register')).toBe('');
    expect(permissionsOf('auth.SearchUsers')).toBe('admin.users.search');
    expect(permissionsOf('auth.AdminUpdateUser')).toBe('admin.users.update');
  });

  it('names the account and the cleanup command when activation fails', async () => {
    const h = await setup({
      grpc: createScript({
        'auth.AdminUpdateUser': () => {
          throw Object.assign(new Error('boom'), { code: 13, details: 'boom' });
        },
      }),
    });
    const error = errorOf(await h.previewThenExecute('demo.CreateAdopter', {}));
    expect(error.hint).toContain(USER_ID);
    expect(error.hint).toContain('pnpm ops demo delete-adopter');
  });

  it('fails clearly when sign-up created no account', async () => {
    const h = await setup({
      grpc: createScript({
        'auth.SearchUsers': () => AuthV1.SearchUsersResponse.fromPartial({ users: [] }),
      }),
    });
    const res = await h.previewThenExecute('demo.CreateAdopter', {});
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(errorOf(res).message).toContain('created no account');
    expect(h.grpc.calls.map(c => c.rpc)).not.toContain('auth.AdminUpdateUser');
  });

  it('names the new account when looking it up after sign-up fails', async () => {
    const h = await setup({
      grpc: createScript({
        'auth.SearchUsers': () => {
          throw Object.assign(new Error('auth unavailable'), { code: 14 });
        },
      }),
    });
    const res = await h.previewThenExecute('demo.CreateAdopter', {});
    const registered = requestOf(h.grpc.calls.find(c => c.rpc === 'auth.Register'));
    expect(errorOf(res).hint).toContain(String(registered.email));
    expect(h.grpc.calls.map(c => c.rpc)).not.toContain('auth.AdminUpdateUser');
  });

  it('rejects a blank first name before planning', async () => {
    const h = await setup({ grpc: createScript() });
    const res = await h.invoke({ rpc: 'demo.CreateAdopter', request: { firstName: '  ' } });
    expect(errorOf(res).code).toBe('INVALID_ARGUMENT');
    expect(h.store.plans.size).toBe(0);
  });
});

describe('demo delete-adopter', () => {
  const deleteScript =
    (email: string) =>
    (call: GrpcCall): unknown => {
      switch (call.method.rpc) {
        case 'auth.AdminGetUser':
          return AuthV1.AdminGetUserResponse.fromPartial({ user: { userId: USER_ID, email } });
        case 'auth.DeactivateUser':
          return AuthV1.DeactivateUserResponse.fromPartial({});
        default:
          throw new Error(`unexpected ${call.method.rpc}`);
      }
    };

  it('refuses an account that is not a demo address and changes nothing', async () => {
    const h = await setup({ grpc: deleteScript('jo@realperson.org') });
    const res = await h.previewThenExecute('demo.DeleteAdopter', { userId: USER_ID });
    expect(errorOf(res).code).toBe('INVALID_ARGUMENT');
    expect(errorOf(res).message).toContain('not a demo account');
    expect(h.grpc.calls.map(c => c.rpc)).toEqual(['auth.AdminGetUser']);
  });

  it('deactivates a demo account with only the permissions it needs', async () => {
    const h = await setup({ grpc: deleteScript(DEMO_EMAIL) });
    const body = bodyOf(await h.previewThenExecute('demo.DeleteAdopter', { userId: USER_ID }));
    expect(body.kind === 'result' && body.response).toEqual({
      userId: USER_ID,
      status: 'deactivated',
    });
    expect(h.grpc.calls.map(c => [c.rpc, c.headers['x-user-permissions']])).toEqual([
      ['auth.AdminGetUser', 'admin.users.read'],
      ['auth.DeactivateUser', 'admin.users.deactivate'],
    ]);
  });

  it('previews without calling any service and rejects a non-UUID id', async () => {
    const h = await setup({ grpc: deleteScript(DEMO_EMAIL) });
    const plan = bodyOf(
      await h.invoke({ rpc: 'demo.DeleteAdopter', request: { userId: USER_ID } })
    );
    expect(plan).toMatchObject({ kind: 'plan', response: null });
    expect(h.grpc.calls).toHaveLength(0);
    const bad = await h.invoke({ rpc: 'demo.DeleteAdopter', request: { userId: 'nope' } });
    expect(errorOf(bad).code).toBe('INVALID_ARGUMENT');
  });
});
