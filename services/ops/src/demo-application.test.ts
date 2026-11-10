import { describe, expect, it } from 'vitest';

import { NewPasswordSchema } from '@adopt-dont-shop/lib.validation';
import { ApplicationsV1, AuthV1, PetsV1, RescueV1 } from '@adopt-dont-shop/proto';
import {
  ErrorResponseSchema,
  InvokeResponseSchema,
  type InvokeResponse,
} from '@adopt-dont-shop/ops-contract';

import type { GrpcCall } from './proto-methods.js';
import { makeHarness, type HarnessOptions } from './test-support.js';

const RESCUE_ID = '44444444-4444-4444-8444-444444444444';
const PET_ID = '66666666-6666-4666-8666-666666666666';
const ADOPTER_ID = '77777777-7777-4777-8777-777777777777';
const APPLICATION_ID = '88888888-8888-4888-8888-888888888888';
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

const jsonOf = (call: GrpcCall): Record<string, unknown> =>
  JSON.parse(JSON.stringify(call.request)) as Record<string, unknown>;

const QUESTIONS = [
  { questionKey: 'phone', questionType: 'phone', isEnabled: true },
  { questionKey: 'garden', questionType: 'boolean', isEnabled: true },
  { questionKey: 'home', questionType: 'select', options: ['House', 'Flat'], isEnabled: true },
  { questionKey: 'pets', questionType: 'multi_select', options: ['Dog', 'Cat'], isEnabled: true },
  { questionKey: 'photo', questionType: 'file', isEnabled: true },
  { questionKey: 'retired', questionType: 'text', isEnabled: false },
];

// Downstream behaviour for a successful create; `override` replaces one rpc.
const createScript =
  (override: Record<string, (call: GrpcCall) => unknown> = {}) =>
  (call: GrpcCall): unknown => {
    const custom = override[call.method.rpc];
    if (custom) {
      return custom(call);
    }
    const app = (version: number) => ({ applicationId: APPLICATION_ID, version });
    switch (call.method.rpc) {
      case 'pets.List':
        return PetsV1.ListPetsResponse.fromPartial({ pets: [{ petId: PET_ID }] });
      case 'rescue.ListApplicationQuestions':
        return RescueV1.ListApplicationQuestionsResponse.fromPartial({
          questions: QUESTIONS.map(q => ({ ...q, questionType: q.questionType })),
        });
      case 'auth.Register':
        return AuthV1.RegisterResponse.fromPartial({});
      case 'auth.SearchUsers':
        return AuthV1.SearchUsersResponse.fromPartial({
          users: [{ userId: ADOPTER_ID, email: String(jsonOf(call).search) }],
        });
      case 'auth.AdminGetUser':
        return AuthV1.AdminGetUserResponse.fromPartial({
          user: {
            userId: ADOPTER_ID,
            email: DEMO_EMAIL,
            userType: AuthV1.UserRole.USER_ROLE_ADOPTER,
          },
        });
      case 'auth.AdminUpdateUser':
        return AuthV1.AdminUpdateUserResponse.fromPartial({ user: { userId: ADOPTER_ID } });
      case 'applications.StartDraft':
        return ApplicationsV1.StartDraftResponse.fromPartial({ application: app(1) });
      case 'applications.SaveDraftAnswers':
        return ApplicationsV1.SaveDraftAnswersResponse.fromPartial({ application: app(2) });
      case 'applications.SubmitDraft':
        return ApplicationsV1.SubmitDraftResponse.fromPartial({ application: app(3) });
      case 'applications.StartReview':
        return ApplicationsV1.StartReviewResponse.fromPartial({ application: app(4) });
      case 'applications.ScheduleHomeVisit':
        return ApplicationsV1.ScheduleHomeVisitResponse.fromPartial({ application: app(5) });
      case 'applications.CompleteHomeVisit':
        return ApplicationsV1.CompleteHomeVisitResponse.fromPartial({ application: app(6) });
      case 'applications.Approve':
        return ApplicationsV1.ApproveResponse.fromPartial({ application: app(7) });
      case 'applications.Reject':
        return ApplicationsV1.RejectResponse.fromPartial({ application: app(7) });
      default:
        throw new Error(`unexpected ${call.method.rpc}`);
    }
  };

const callOf = (h: Awaited<ReturnType<typeof setup>>, rpc: string) =>
  h.grpc.calls.find(c => c.rpc === rpc);
const requestOf = (h: Awaited<ReturnType<typeof setup>>, rpc: string) =>
  JSON.parse(JSON.stringify(callOf(h, rpc)?.request ?? null)) as Record<string, unknown>;
const headersOf = (h: Awaited<ReturnType<typeof setup>>, rpc: string) =>
  callOf(h, rpc)?.headers ?? {};

describe('demo create-application', () => {
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
      expect.arrayContaining(['create-application', 'delete-application'])
    );
    expect(await commandsIn('staging')).toEqual(
      expect.arrayContaining(['create-application', 'delete-application'])
    );
    expect(await commandsIn('prod')).toEqual([]);
  });

  it('is refused in prod before anything runs', async () => {
    const h = await setup({ env: 'prod', grpc: createScript() });
    const res = await h.invoke({
      rpc: 'demo.CreateApplication',
      request: { rescueId: RESCUE_ID },
    });
    expect(errorOf(res).code).toBe('NOT_ENABLED');
    expect(h.grpc.calls).toHaveLength(0);
  });

  it('previews as a plan without calling any service', async () => {
    const h = await setup({ grpc: createScript() });
    const plan = bodyOf(
      await h.invoke({ rpc: 'demo.CreateApplication', request: { rescueId: RESCUE_ID } })
    );
    expect(plan).toMatchObject({ kind: 'plan', dryRun: 'preview-only', response: null });
    expect(h.grpc.calls).toHaveLength(0);
  });

  it('rejects an unknown stage before planning', async () => {
    const h = await setup({ grpc: createScript() });
    const res = await h.invoke({
      rpc: 'demo.CreateApplication',
      request: { rescueId: RESCUE_ID, stage: 'adopted' },
    });
    expect(errorOf(res).code).toBe('INVALID_ARGUMENT');
    expect(h.store.plans.size).toBe(0);
  });

  it('creates an active adopter and a submitted application, showing the login once', async () => {
    const h = await setup({ env: 'staging', grpc: createScript() });
    const body = bodyOf(
      await h.previewThenExecute('demo.CreateApplication', { rescueId: RESCUE_ID })
    );
    expect(body.kind).toBe('result');
    const result = (body.kind === 'result' ? body.response : {}) as Record<string, unknown>;

    expect(h.grpc.calls.map(c => c.rpc)).toEqual([
      'pets.List',
      'rescue.ListApplicationQuestions',
      'auth.Register',
      'auth.SearchUsers',
      'auth.AdminUpdateUser',
      'auth.AdminGetUser',
      'applications.StartDraft',
      'applications.SaveDraftAnswers',
      'applications.SubmitDraft',
    ]);

    const registered = requestOf(h, 'auth.Register');
    expect(registered.email).toMatch(/^demo-[a-z0-9]{10}@example\.com$/);
    expect(NewPasswordSchema.safeParse(registered.password).success).toBe(true);
    expect(requestOf(h, 'pets.List')).toMatchObject({
      rescueIdFilter: RESCUE_ID,
      statusFilter: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
    });
    // Read as an unscoped caller, like the adopter's StartDraft will: a
    // rescue-scoped reader also sees archived pets, which StartDraft rejects.
    expect(headersOf(h, 'pets.List')['x-rescue-id']).toBeUndefined();
    expect(requestOf(h, 'auth.AdminUpdateUser')).toMatchObject({
      userId: ADOPTER_ID,
      status: AuthV1.UserStatus.USER_STATUS_ACTIVE,
      emailVerified: true,
    });
    expect(requestOf(h, 'applications.StartDraft')).toMatchObject({
      adopterId: ADOPTER_ID,
      petId: PET_ID,
    });
    // Versions are carried from each response into the next call.
    expect(requestOf(h, 'applications.SaveDraftAnswers')).toMatchObject({
      applicationId: APPLICATION_ID,
      expectedVersion: 1,
    });
    expect(requestOf(h, 'applications.SubmitDraft')).toMatchObject({ expectedVersion: 2 });

    expect(result).toMatchObject({
      applicationId: APPLICATION_ID,
      adopterUserId: ADOPTER_ID,
      adopterEmail: registered.email,
      adopterPassword: registered.password,
      petId: PET_ID,
      stage: 'submitted',
    });
    expect(String(result.nextSteps)).toContain(
      `pnpm ops demo delete-application ${APPLICATION_ID} --rescue-id ${RESCUE_ID}`
    );
    expect(body.hidden).toEqual([]);

    // The password exists only in the execute result: never in the plan, the
    // access log or the audit events.
    const persisted = JSON.stringify({
      log: h.store.accessLog,
      events: h.store.events,
      plans: [...h.store.plans.values()],
    });
    expect(persisted).not.toContain(String(registered.password));
  });

  it('answers the rescue questions from their definitions', async () => {
    const h = await setup({ grpc: createScript() });
    await h.previewThenExecute('demo.CreateApplication', { rescueId: RESCUE_ID });
    const answers = JSON.parse(
      String(requestOf(h, 'applications.SaveDraftAnswers').answersPatchJson)
    ) as Record<string, unknown>;
    expect(answers).toEqual({
      phone: expect.any(String),
      garden: true,
      home: 'House',
      pets: ['Dog'],
    });
  });

  it('acts as the adopter for the draft steps and as scoped staff for the rest', async () => {
    const h = await setup({ grpc: createScript() });
    await h.previewThenExecute('demo.CreateApplication', {
      rescueId: RESCUE_ID,
      stage: 'home_visit_completed',
    });

    expect(h.grpc.calls.map(c => c.rpc).slice(-6)).toEqual([
      'applications.StartDraft',
      'applications.SaveDraftAnswers',
      'applications.SubmitDraft',
      'applications.StartReview',
      'applications.ScheduleHomeVisit',
      'applications.CompleteHomeVisit',
    ]);

    expect(headersOf(h, 'auth.AdminGetUser')['x-user-permissions']).toBe('admin.users.read');
    expect(headersOf(h, 'applications.StartDraft')['x-user-id']).toBe(ADOPTER_ID);
    expect(headersOf(h, 'applications.StartDraft')['x-user-permissions']).toBe(
      'applications.create,pets.read'
    );
    expect(headersOf(h, 'applications.SubmitDraft')['x-user-id']).toBe(ADOPTER_ID);
    expect(headersOf(h, 'applications.SubmitDraft')['x-user-permissions']).toBe(
      'applications.update'
    );
    expect(headersOf(h, 'applications.SubmitDraft')['x-rescue-id']).toBeUndefined();

    for (const rpc of [
      'applications.StartReview',
      'applications.ScheduleHomeVisit',
      'applications.CompleteHomeVisit',
    ]) {
      expect(headersOf(h, rpc)['x-user-id']).not.toBe(ADOPTER_ID);
      expect(headersOf(h, rpc)['x-user-permissions']).toBe('applications.review');
      expect(headersOf(h, rpc)['x-rescue-id']).toBe(RESCUE_ID);
    }
    expect(requestOf(h, 'applications.CompleteHomeVisit')).toMatchObject({
      outcome: ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_PASSED,
    });
  });

  it.each([
    ['under_review', ['applications.StartReview'], 'applications.review'],
    ['approved', ['applications.StartReview', 'applications.Approve'], 'applications.approve'],
    ['rejected', ['applications.StartReview', 'applications.Reject'], 'applications.reject'],
  ])('moves the application to %s', async (stage, staffRpcs, lastPermission) => {
    const h = await setup({ grpc: createScript() });
    const body = bodyOf(
      await h.previewThenExecute('demo.CreateApplication', { rescueId: RESCUE_ID, stage })
    );
    expect(h.grpc.calls.map(c => c.rpc).slice(-staffRpcs.length)).toEqual(staffRpcs);
    const last = staffRpcs[staffRpcs.length - 1];
    expect(headersOf(h, last)['x-user-permissions']).toBe(lastPermission);
    expect(body.kind === 'result' && body.response).toMatchObject({ stage });
  });

  it('uses the pet it is given when that pet is an available pet of the rescue', async () => {
    const h = await setup({
      grpc: createScript({
        'pets.Get': () =>
          PetsV1.GetPetResponse.fromPartial({
            pet: {
              petId: PET_ID,
              rescueId: RESCUE_ID,
              status: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
            },
          }),
      }),
    });
    await h.previewThenExecute('demo.CreateApplication', { rescueId: RESCUE_ID, petId: PET_ID });
    expect(h.grpc.calls.map(c => c.rpc)).not.toContain('pets.List');
    expect(requestOf(h, 'applications.StartDraft')).toMatchObject({ petId: PET_ID });
  });

  it('refuses a pet of another rescue and creates nothing', async () => {
    const h = await setup({
      grpc: createScript({
        'pets.Get': () =>
          PetsV1.GetPetResponse.fromPartial({
            pet: {
              petId: PET_ID,
              rescueId: '99999999-9999-4999-8999-999999999999',
              status: PetsV1.PetStatus.PET_STATUS_AVAILABLE,
            },
          }),
      }),
    });
    const res = await h.previewThenExecute('demo.CreateApplication', {
      rescueId: RESCUE_ID,
      petId: PET_ID,
    });
    expect(errorOf(res).code).toBe('INVALID_ARGUMENT');
    expect(h.grpc.calls.map(c => c.rpc)).toEqual(['pets.Get']);
  });

  it('creates nothing when the rescue has no available pet', async () => {
    const h = await setup({
      grpc: createScript({ 'pets.List': () => PetsV1.ListPetsResponse.fromPartial({}) }),
    });
    const res = await h.previewThenExecute('demo.CreateApplication', { rescueId: RESCUE_ID });
    expect(errorOf(res).message).toContain('no available pet');
    expect(h.grpc.calls.map(c => c.rpc)).toEqual(['pets.List']);
  });

  it('refuses to act as an account that is not a generated demo adopter', async () => {
    const h = await setup({
      grpc: createScript({
        'auth.AdminGetUser': () =>
          AuthV1.AdminGetUserResponse.fromPartial({
            user: {
              userId: ADOPTER_ID,
              email: 'jo@realrescue.org',
              userType: AuthV1.UserRole.USER_ROLE_ADOPTER,
            },
          }),
      }),
    });
    const res = await h.previewThenExecute('demo.CreateApplication', { rescueId: RESCUE_ID });
    expect(errorOf(res).message).toContain('not a generated demo adopter');
    expect(errorOf(res).hint).toContain(ADOPTER_ID);
    expect(h.grpc.calls.map(c => c.rpc)).not.toContain('applications.StartDraft');
  });

  it('refuses to act as a demo-looking account that is not an adopter', async () => {
    const h = await setup({
      grpc: createScript({
        'auth.AdminGetUser': () =>
          AuthV1.AdminGetUserResponse.fromPartial({
            user: {
              userId: ADOPTER_ID,
              email: DEMO_EMAIL,
              userType: AuthV1.UserRole.USER_ROLE_ADMIN,
            },
          }),
      }),
    });
    const res = await h.previewThenExecute('demo.CreateApplication', { rescueId: RESCUE_ID });
    expect(errorOf(res).message).toContain('not a generated demo adopter');
    expect(h.grpc.calls.map(c => c.rpc)).not.toContain('applications.StartDraft');
  });

  it('names what it already created when a staff step fails', async () => {
    const h = await setup({
      grpc: createScript({
        'applications.StartReview': () => {
          throw Object.assign(new Error('boom'), { code: 13, details: 'boom' });
        },
      }),
    });
    const res = await h.previewThenExecute('demo.CreateApplication', {
      rescueId: RESCUE_ID,
      stage: 'approved',
    });
    const error = errorOf(res);
    expect(error.hint).toContain(APPLICATION_ID);
    expect(error.hint).toContain(ADOPTER_ID);
    expect(error.hint).toContain('pnpm ops demo delete-application');
    expect(h.grpc.calls.map(c => c.rpc)).not.toContain('applications.Approve');
  });

  it('points at removing the adopter when it fails before the submit', async () => {
    const h = await setup({
      grpc: createScript({
        'applications.SubmitDraft': () => {
          throw Object.assign(new Error('boom'), { code: 13, details: 'boom' });
        },
      }),
    });
    const res = await h.previewThenExecute('demo.CreateApplication', { rescueId: RESCUE_ID });
    expect(errorOf(res).hint).toContain(`pnpm ops demo delete-adopter ${ADOPTER_ID}`);
  });

  it('fails when the generated email already has an account', async () => {
    const h = await setup({
      grpc: createScript({
        'auth.SearchUsers': () => AuthV1.SearchUsersResponse.fromPartial({}),
      }),
    });
    const res = await h.previewThenExecute('demo.CreateApplication', { rescueId: RESCUE_ID });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(errorOf(res).message).toContain('created no account');
    expect(h.grpc.calls.map(c => c.rpc)).not.toContain('applications.StartDraft');
  });
});

describe('demo delete-application', () => {
  const deleteScript =
    (
      adopterEmail: string,
      status: ApplicationsV1.ApplicationStatus,
      applicationRescueId = RESCUE_ID
    ) =>
    (call: GrpcCall): unknown => {
      switch (call.method.rpc) {
        case 'applications.Get':
          return ApplicationsV1.GetApplicationResponse.fromPartial({
            application: {
              applicationId: APPLICATION_ID,
              adopterId: ADOPTER_ID,
              rescueId: applicationRescueId,
              status,
            },
          });
        case 'auth.AdminGetUser':
          return AuthV1.AdminGetUserResponse.fromPartial({
            user: { userId: ADOPTER_ID, email: adopterEmail },
          });
        case 'applications.Withdraw':
          return ApplicationsV1.WithdrawResponse.fromPartial({});
        case 'auth.DeactivateUser':
          return AuthV1.DeactivateUserResponse.fromPartial({});
        default:
          throw new Error(`unexpected ${call.method.rpc}`);
      }
    };
  const request = { applicationId: APPLICATION_ID, rescueId: RESCUE_ID };
  const { APPLICATION_STATUS_UNDER_REVIEW, APPLICATION_STATUS_APPROVED } =
    ApplicationsV1.ApplicationStatus;

  it('refuses an application whose adopter is not a demo account and changes nothing', async () => {
    const h = await setup({
      grpc: deleteScript('jo@realrescue.org', APPLICATION_STATUS_UNDER_REVIEW),
    });
    const res = await h.previewThenExecute('demo.DeleteApplication', request);
    expect(errorOf(res).code).toBe('INVALID_ARGUMENT');
    expect(errorOf(res).message).toContain('not a demo application');
    expect(h.grpc.calls.map(c => c.rpc)).toEqual(['applications.Get', 'auth.AdminGetUser']);
  });

  it('refuses an application that belongs to a different rescue', async () => {
    const h = await setup({
      grpc: deleteScript(
        DEMO_EMAIL,
        APPLICATION_STATUS_UNDER_REVIEW,
        '99999999-9999-4999-8999-999999999999'
      ),
    });
    const res = await h.previewThenExecute('demo.DeleteApplication', request);
    expect(errorOf(res).code).toBe('INVALID_ARGUMENT');
    expect(h.grpc.calls.map(c => c.rpc)).toEqual(['applications.Get']);
  });

  it('withdraws the application and deactivates the demo adopter', async () => {
    const h = await setup({ grpc: deleteScript(DEMO_EMAIL, APPLICATION_STATUS_UNDER_REVIEW) });
    const body = bodyOf(await h.previewThenExecute('demo.DeleteApplication', request));
    expect(body.kind === 'result' && body.response).toEqual({
      applicationId: APPLICATION_ID,
      action: 'withdrawn',
      status: 'APPLICATION_STATUS_WITHDRAWN',
      deactivatedUserIds: [ADOPTER_ID],
    });
    expect(h.grpc.calls.map(c => c.rpc)).toEqual([
      'applications.Get',
      'auth.AdminGetUser',
      'applications.Withdraw',
      'auth.DeactivateUser',
    ]);
    expect(headersOf(h, 'applications.Get')['x-user-permissions']).toBe('applications.read');
    expect(headersOf(h, 'applications.Get')['x-rescue-id']).toBe(RESCUE_ID);
    expect(headersOf(h, 'applications.Withdraw')['x-user-permissions']).toBe('applications.update');
    expect(headersOf(h, 'applications.Withdraw')['x-rescue-id']).toBe(RESCUE_ID);
    expect(headersOf(h, 'auth.DeactivateUser')['x-user-permissions']).toBe(
      'admin.users.deactivate'
    );
    expect(requestOf(h, 'auth.DeactivateUser')).toMatchObject({ userId: ADOPTER_ID });
  });

  it('leaves an already decided application as it is but still deactivates the adopter', async () => {
    const h = await setup({ grpc: deleteScript(DEMO_EMAIL, APPLICATION_STATUS_APPROVED) });
    const body = bodyOf(await h.previewThenExecute('demo.DeleteApplication', request));
    expect(body.kind === 'result' && body.response).toMatchObject({
      action: 'left as is',
      status: 'APPLICATION_STATUS_APPROVED',
    });
    expect(h.grpc.calls.map(c => c.rpc)).not.toContain('applications.Withdraw');
    expect(h.grpc.calls.map(c => c.rpc)).toContain('auth.DeactivateUser');
  });

  it('is refused in prod', async () => {
    const h = await setup({
      env: 'prod',
      grpc: deleteScript(DEMO_EMAIL, APPLICATION_STATUS_UNDER_REVIEW),
    });
    const res = await h.invoke({ rpc: 'demo.DeleteApplication', request });
    expect(errorOf(res).code).toBe('NOT_ENABLED');
    expect(h.grpc.calls).toHaveLength(0);
  });
});
