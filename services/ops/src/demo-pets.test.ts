import { describe, expect, it } from 'vitest';

import { PetsV1, RescueV1 } from '@adopt-dont-shop/proto';
import {
  ErrorResponseSchema,
  InvokeResponseSchema,
  type InvokeResponse,
} from '@adopt-dont-shop/ops-contract';

import type { GrpcCall } from './proto-methods.js';
import { makeHarness, type HarnessOptions } from './test-support.js';

const RESCUE_ID = '44444444-4444-4444-8444-444444444444';

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

const notFound = () => Object.assign(new Error('nope'), { code: 5, details: 'not found' });

const requestOf = (call: { readonly request: unknown } | undefined) =>
  JSON.parse(JSON.stringify(call?.request ?? null)) as Record<string, unknown>;

describe('demo create-pets', () => {
  const createScript =
    (override: Record<string, (call: GrpcCall) => unknown> = {}) =>
    (call: GrpcCall): unknown => {
      const custom = override[call.method.rpc];
      if (custom) {
        return custom(call);
      }
      switch (call.method.rpc) {
        case 'rescue.Get':
          return RescueV1.GetRescueResponse.fromPartial({ rescue: { rescueId: RESCUE_ID } });
        case 'pets.Create':
          return PetsV1.CreatePetResponse.fromPartial({
            pet: { petId: `pet-${String(Reflect.get(Object(call.request), 'name'))}` },
          });
        default:
          throw new Error(`unexpected ${call.method.rpc}`);
      }
    };

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
    expect(await commandsIn('dev')).toEqual(expect.arrayContaining(['create-pets', 'delete-pets']));
    expect(await commandsIn('staging')).toEqual(
      expect.arrayContaining(['create-pets', 'delete-pets'])
    );
    expect(await commandsIn('prod')).toEqual([]);
  });

  it('is refused in prod before anything runs', async () => {
    const h = await setup({ env: 'prod', grpc: createScript() });
    const res = await h.invoke({ rpc: 'demo.CreatePets', request: { rescueId: RESCUE_ID } });
    expect(errorOf(res).code).toBe('NOT_ENABLED');
    expect(h.grpc.calls).toHaveLength(0);
  });

  it('previews as a plan without calling any service', async () => {
    const h = await setup({ grpc: createScript() });
    const plan = bodyOf(
      await h.invoke({ rpc: 'demo.CreatePets', request: { rescueId: RESCUE_ID, count: 2 } })
    );
    expect(plan).toMatchObject({ kind: 'plan', dryRun: 'preview-only', response: null });
    expect(h.grpc.calls).toHaveLength(0);
  });

  it('adds five tagged available pets by default after checking the rescue is verified', async () => {
    const h = await setup({ grpc: createScript() });
    const body = bodyOf(await h.previewThenExecute('demo.CreatePets', { rescueId: RESCUE_ID }));
    const result = (body.kind === 'result' ? body.response : {}) as Record<string, unknown>;

    expect(h.grpc.calls.map(c => c.rpc)).toEqual([
      'rescue.Get',
      ...Array.from({ length: 5 }, () => 'pets.Create'),
    ]);
    expect(result.rescueId).toBe(RESCUE_ID);
    expect(result.petIds).toHaveLength(5);
    expect(String(result.nextSteps)).toContain(`pnpm ops demo delete-pets ${RESCUE_ID}`);

    const creates = h.grpc.calls.filter(c => c.rpc === 'pets.Create');
    creates.forEach(c => {
      expect(requestOf(c)).toMatchObject({ rescueId: RESCUE_ID, tagsJson: '["demo"]' });
      expect(c.headers['x-user-permissions']).toBe('pets.create,pets.manage:any');
      expect(c.headers['x-rescue-id']).toBe(RESCUE_ID);
    });
  });

  it('checks the rescue with no permissions, so only a verified rescue is visible', async () => {
    const h = await setup({ grpc: createScript() });
    await h.previewThenExecute('demo.CreatePets', { rescueId: RESCUE_ID, count: 1 });
    const get = h.grpc.calls.find(c => c.rpc === 'rescue.Get');
    expect(get?.headers['x-user-permissions']).toBe('');
  });

  it('explains when the rescue does not exist or is not verified, creating nothing', async () => {
    const h = await setup({
      grpc: createScript({
        'rescue.Get': () => {
          throw notFound();
        },
      }),
    });
    const res = await h.previewThenExecute('demo.CreatePets', { rescueId: RESCUE_ID });
    expect(errorOf(res).code).toBe('NOT_FOUND');
    expect(errorOf(res).message).toContain('verified');
    expect(h.grpc.calls.map(c => c.rpc)).toEqual(['rescue.Get']);
  });

  it('names the pets already created and the cleanup command when a create fails', async () => {
    let n = 0;
    const h = await setup({
      grpc: createScript({
        'pets.Create': call => {
          n += 1;
          if (n === 2) {
            throw Object.assign(new Error('boom'), { code: 13, details: 'boom' });
          }
          return PetsV1.CreatePetResponse.fromPartial({
            pet: { petId: `pet-${String(Reflect.get(Object(call.request), 'name'))}` },
          });
        },
      }),
    });
    const res = await h.previewThenExecute('demo.CreatePets', { rescueId: RESCUE_ID, count: 3 });
    expect(errorOf(res).hint).toContain('pet pet-Biscuit');
    expect(errorOf(res).hint).toContain(`pnpm ops demo delete-pets ${RESCUE_ID}`);
  });

  it('rejects a count above 25, a count of 0 and a non-UUID rescue before planning', async () => {
    const h = await setup({ grpc: createScript() });
    const over = await h.invoke({
      rpc: 'demo.CreatePets',
      request: { rescueId: RESCUE_ID, count: 26 },
    });
    expect(errorOf(over).code).toBe('INVALID_ARGUMENT');
    const zero = await h.invoke({
      rpc: 'demo.CreatePets',
      request: { rescueId: RESCUE_ID, count: 0 },
    });
    expect(errorOf(zero).code).toBe('INVALID_ARGUMENT');
    const bad = await h.invoke({ rpc: 'demo.CreatePets', request: { rescueId: 'nope' } });
    expect(errorOf(bad).code).toBe('INVALID_ARGUMENT');
    expect(h.store.plans.size).toBe(0);
  });

  it('accepts the maximum of 25', async () => {
    const h = await setup({ grpc: createScript() });
    const body = bodyOf(
      await h.previewThenExecute('demo.CreatePets', { rescueId: RESCUE_ID, count: 25 })
    );
    expect(body.kind === 'result' && (body.response as { petIds: string[] }).petIds).toHaveLength(
      25
    );
  });
});

describe('demo delete-pets', () => {
  const pet = (petId: string, tags: readonly string[]) => ({
    petId,
    tagsJson: JSON.stringify(tags),
  });

  const deleteScript =
    (pets: readonly { petId: string; tagsJson: string }[]) =>
    (call: GrpcCall): unknown => {
      const request = requestOf(call);
      switch (call.method.rpc) {
        case 'pets.List':
          return request.cursor === undefined
            ? PetsV1.ListPetsResponse.fromPartial({ pets: pets.slice(0, 2), nextCursor: 'p2' })
            : PetsV1.ListPetsResponse.fromPartial({ pets: pets.slice(2) });
        case 'pets.Delete':
          return PetsV1.DeletePetResponse.fromPartial({});
        default:
          throw new Error(`unexpected ${call.method.rpc}`);
      }
    };

  it('deletes only the pets carrying the demo tag', async () => {
    const h = await setup({
      grpc: deleteScript([
        pet('pet-1', ['demo']),
        pet('pet-2', ['friendly']),
        pet('pet-3', ['friendly', 'demo']),
        pet('pet-4', []),
      ]),
    });
    const body = bodyOf(await h.previewThenExecute('demo.DeletePets', { rescueId: RESCUE_ID }));
    expect(body.kind === 'result' && body.response).toEqual({
      rescueId: RESCUE_ID,
      deletedPetIds: ['pet-1', 'pet-3'],
    });
    const deletes = h.grpc.calls.filter(c => c.rpc === 'pets.Delete');
    expect(deletes.map(c => requestOf(c).petId)).toEqual(['pet-1', 'pet-3']);
    deletes.forEach(c => {
      expect(c.headers['x-user-permissions']).toBe('pets.delete,pets.manage:any');
      expect(c.headers['x-rescue-id']).toBe(RESCUE_ID);
    });
    const list = h.grpc.calls.find(c => c.rpc === 'pets.List');
    expect(list?.headers['x-user-permissions']).toBe('pets.read');
    expect(requestOf(list)).toMatchObject({ rescueIdFilter: RESCUE_ID });
  });

  it('deletes nothing when no pet is marked', async () => {
    const h = await setup({ grpc: deleteScript([pet('pet-1', []), pet('pet-2', ['friendly'])]) });
    const body = bodyOf(await h.previewThenExecute('demo.DeletePets', { rescueId: RESCUE_ID }));
    expect(body.kind === 'result' && body.response).toEqual({ rescueId: RESCUE_ID });
    expect(h.grpc.calls.map(c => c.rpc)).not.toContain('pets.Delete');
  });

  it('ignores a malformed tags value rather than deleting the pet', async () => {
    const h = await setup({
      grpc: deleteScript([{ petId: 'pet-1', tagsJson: 'not json' }, pet('pet-2', ['demo'])]),
    });
    const body = bodyOf(await h.previewThenExecute('demo.DeletePets', { rescueId: RESCUE_ID }));
    expect(body.kind === 'result' && body.response).toMatchObject({ deletedPetIds: ['pet-2'] });
  });

  it('previews without calling a service, and is refused in prod', async () => {
    const h = await setup({ grpc: deleteScript([]) });
    const plan = bodyOf(
      await h.invoke({ rpc: 'demo.DeletePets', request: { rescueId: RESCUE_ID } })
    );
    expect(plan).toMatchObject({ kind: 'plan', dryRun: 'preview-only' });
    expect(h.grpc.calls).toHaveLength(0);

    const prod = await setup({ env: 'prod', grpc: deleteScript([]) });
    const res = await prod.invoke({ rpc: 'demo.DeletePets', request: { rescueId: RESCUE_ID } });
    expect(errorOf(res).code).toBe('NOT_ENABLED');
    expect(prod.grpc.calls).toHaveLength(0);
  });

  it('rejects a non-UUID rescue id before planning', async () => {
    const h = await setup({ grpc: deleteScript([]) });
    const res = await h.invoke({ rpc: 'demo.DeletePets', request: { rescueId: 'nope' } });
    expect(errorOf(res).code).toBe('INVALID_ARGUMENT');
    expect(h.store.plans.size).toBe(0);
  });
});
