import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RescueV1 } from '@adopt-dont-shop/proto';

import type { RescueClient } from '../grpc-clients/rescue-client.js';

import { registerRescuesPublicRoutes } from './rescues-public.js';

function makeClient(): {
  client: RescueClient;
  mocks: Record<string, ReturnType<typeof vi.fn>>;
} {
  const mocks: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['list', 'get', 'create', 'update', 'verify', 'inviteStaff']) {
    mocks[m] = vi.fn();
  }
  const client = { ...mocks, close: vi.fn() } as unknown as RescueClient;
  return { client, mocks };
}

async function makeApp(client: RescueClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerRescuesPublicRoutes(app, { client });
  return app;
}

const RESCUE = {
  rescueId: 'rsc-1',
  name: 'Happy Tails',
  email: 'hi@happy.example',
  address: '1 Lane',
  city: 'York',
  postcode: 'YO1 1AA',
  country: 'GB',
  contactPerson: 'Jo',
  status: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
  settingsJson: '{}',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-02T00:00:00.000Z',
};

describe('rescues public routes', () => {
  let app: FastifyInstance;
  let mocks: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    const m = makeClient();
    mocks = m.mocks;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/rescues forwards name search + status filter and returns the envelope', async () => {
    mocks.list.mockResolvedValueOnce({ rescues: [RESCUE], nextCursor: 'cur' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/rescues?search=happy&status=verified',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      success: boolean;
      data: Array<{ rescue_id: string }>;
      meta: { hasNext: boolean };
    };
    expect(body.success).toBe(true);
    expect(body.data[0].rescue_id).toBe('rsc-1');
    expect(body.meta.hasNext).toBe(true);
    expect(mocks.list.mock.calls[0][0]).toMatchObject({
      nameSearch: 'happy',
      statusFilter: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
    });
  });

  it('GET /api/v1/rescues/featured sets randomize=true with a small default limit', async () => {
    mocks.list.mockResolvedValueOnce({ rescues: [RESCUE] });
    await app.inject({ method: 'GET', url: '/api/v1/rescues/featured' });
    expect(mocks.list.mock.calls[0][0]).toMatchObject({ randomize: true, limit: 8 });
  });

  it('GET /api/v1/rescues/search threads `search` or `q` as nameSearch', async () => {
    mocks.list.mockResolvedValueOnce({ rescues: [] });
    await app.inject({ method: 'GET', url: '/api/v1/rescues/search?q=labs' });
    expect(mocks.list.mock.calls[0][0].nameSearch).toBe('labs');
  });

  it('GET /api/v1/rescues/nearby threads lat/lng/radiusKm', async () => {
    mocks.list.mockResolvedValueOnce({ rescues: [] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/rescues/nearby?lat=53.96&lng=-1.08&radiusKm=25',
    });
    expect(mocks.list.mock.calls[0][0]).toMatchObject({
      latitude: 53.96,
      longitude: -1.08,
      radiusKm: 25,
    });
  });

  it('GET /api/v1/rescues/followed returns an empty page without calling the service', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/rescues/followed' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, data: [], meta: { hasNext: false } });
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('GET /api/v1/rescues/:id returns { success, data: view } or 404', async () => {
    mocks.get.mockResolvedValueOnce({ rescue: RESCUE });
    const ok = await app.inject({ method: 'GET', url: '/api/v1/rescues/rsc-1' });
    expect((ok.json() as { data: { rescue_id: string } }).data.rescue_id).toBe('rsc-1');

    mocks.get.mockResolvedValueOnce({ rescue: undefined });
    const missing = await app.inject({ method: 'GET', url: '/api/v1/rescues/rsc-x' });
    expect(missing.statusCode).toBe(404);
    expect((missing.json() as { success: boolean }).success).toBe(false);
  });

  it('POST /api/v1/rescues/register accepts snake_case + camelCase and creates', async () => {
    mocks.create.mockResolvedValueOnce({ rescue: RESCUE });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/rescues/register',
      payload: {
        name: 'Happy Tails',
        email: 'hi@happy.example',
        address: '1 Lane',
        city: 'York',
        zip_code: 'YO1 1AA',
        contactPerson: 'Jo',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      name: 'Happy Tails',
      postcode: 'YO1 1AA',
      contactPerson: 'Jo',
    });
  });

  it('POST /api/v1/rescues is also Create', async () => {
    mocks.create.mockResolvedValueOnce({ rescue: RESCUE });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/rescues',
      payload: {
        name: 'Happy Tails',
        email: 'hi@happy.example',
        address: '1 Lane',
        city: 'York',
        postcode: 'YO1 1AA',
        contact_person: 'Jo',
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('PUT /api/v1/rescues/:id updates the profile, unpacking nested address', async () => {
    mocks.update.mockResolvedValueOnce({ rescue: RESCUE });
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/rescues/rsc-1',
      payload: {
        name: 'Happy Tails Renamed',
        phone: '01234',
        address: { street: '2 Lane', city: 'Leeds', postcode: 'LS1 1AA', country: 'GB' },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.update.mock.calls[0][0]).toMatchObject({
      rescueId: 'rsc-1',
      name: 'Happy Tails Renamed',
      phone: '01234',
      address: '2 Lane',
      city: 'Leeds',
      postcode: 'LS1 1AA',
      country: 'GB',
    });
    expect((res.json() as { data: { rescue_id: string } }).data.rescue_id).toBe('rsc-1');
  });

  it('PUT /api/v1/rescues/:id 404s when the rescue does not exist', async () => {
    mocks.update.mockResolvedValueOnce({ rescue: undefined });
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/rescues/rsc-x',
      payload: { name: 'Ghost' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/v1/rescues/:id/adoption-policies reads adoptionPolicies out of settings', async () => {
    mocks.get.mockResolvedValueOnce({
      rescue: {
        ...RESCUE,
        settingsJson: JSON.stringify({ adoptionPolicies: { requireHomeVisit: true } }),
      },
    });
    const res = await app.inject({ method: 'GET', url: '/api/v1/rescues/rsc-1/adoption-policies' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, data: { requireHomeVisit: true } });
  });

  it('GET /api/v1/rescues/:id/adoption-policies returns null when none are set', async () => {
    mocks.get.mockResolvedValueOnce({ rescue: RESCUE });
    const res = await app.inject({ method: 'GET', url: '/api/v1/rescues/rsc-1/adoption-policies' });
    expect(res.json()).toEqual({ success: true, data: null });
  });

  it('PUT /api/v1/rescues/:id/adoption-policies merges into settings without clobbering other keys', async () => {
    mocks.get.mockResolvedValueOnce({
      rescue: { ...RESCUE, settingsJson: JSON.stringify({ theme: 'dark' }) },
    });
    mocks.update.mockResolvedValueOnce({ rescue: RESCUE });
    const policy = { requireHomeVisit: true, minimumReferenceCount: 2 };
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/rescues/rsc-1/adoption-policies',
      payload: policy,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true, data: policy });
    const updateArg = mocks.update.mock.calls[0][0] as { rescueId: string; settingsJson: string };
    expect(updateArg.rescueId).toBe('rsc-1');
    expect(JSON.parse(updateArg.settingsJson)).toEqual({ theme: 'dark', adoptionPolicies: policy });
  });

  it('PUT /api/v1/rescues/:id/adoption-policies 404s when the rescue does not exist', async () => {
    mocks.get.mockResolvedValueOnce({ rescue: undefined });
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/rescues/rsc-x/adoption-policies',
      payload: {},
    });
    expect(res.statusCode).toBe(404);
  });
});
