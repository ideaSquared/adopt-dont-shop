import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RescueV1 } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';

import { registerRescueRegisterRoutes } from './rescue-register.js';

const RESCUE = {
  rescueId: 'rsc-1',
  name: 'Happy Tails',
  email: 'hello@happytails.org',
  address: '1 Rescue Lane',
  city: 'London',
  postcode: 'SW1A 1AA',
  country: 'GB',
  contactPerson: 'Rae Scue',
  status: RescueV1.RescueStatus.RESCUE_STATUS_PENDING,
  settingsJson: '{}',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  version: 0,
};

// The body the rescue app's /register-rescue form posts.
const FORM_BODY = {
  firstName: 'Rae',
  lastName: 'Scue',
  email: 'owner@example.com',
  password: 'BehaviourTest123!',
  name: 'Happy Tails',
  rescueEmail: 'hello@happytails.org',
  address: '1 Rescue Lane',
  city: 'London',
  postcode: 'SW1A 1AA',
  country: 'GB',
};

function makeClients() {
  const registerRescueOwner = vi.fn();
  const registerRescue = vi.fn();
  return {
    registerRescueOwner,
    registerRescue,
    authClient: { registerRescueOwner, close: vi.fn() } as unknown as AuthClient,
    rescueClient: { registerRescue, close: vi.fn() } as unknown as RescueClient,
  };
}

describe('POST /api/v1/rescues/register', () => {
  let app: FastifyInstance;
  let m: ReturnType<typeof makeClients>;

  beforeEach(async () => {
    m = makeClients();
    app = Fastify({ logger: false, trustProxy: true });
    // server.ts registers the plugin globally; the route only sets its own cap.
    const { default: rateLimit } = await import('@fastify/rate-limit');
    await app.register(rateLimit, { global: true, max: 1000, timeWindow: '1 minute' });
    await registerRescueRegisterRoutes(app, {
      authClient: m.authClient,
      rescueClient: m.rescueClient,
    });
  });

  afterEach(async () => {
    await app.close();
    vi.resetAllMocks();
  });

  const post = (payload: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: '/api/v1/rescues/register', payload });

  it('is public: it is registered with config.public so anonymous visitors reach it', async () => {
    let isPublic: unknown;
    const probe = Fastify({ logger: false });
    probe.addHook('onRoute', route => {
      if (route.url === '/api/v1/rescues/register') {
        isPublic = (route.config as { public?: boolean } | undefined)?.public;
      }
    });
    await registerRescueRegisterRoutes(probe, {
      authClient: m.authClient,
      rescueClient: m.rescueClient,
    });
    await probe.close();
    expect(isPublic).toBe(true);
  });

  it('creates the owner account, then a pending rescue owned by them, and returns 201', async () => {
    m.registerRescueOwner.mockResolvedValueOnce({ user: { userId: 'usr-owner' } });
    m.registerRescue.mockResolvedValueOnce({ rescue: RESCUE });

    const res = await post(FORM_BODY);

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ success: true });
    expect(m.registerRescueOwner.mock.calls[0][0]).toEqual({
      email: 'owner@example.com',
      password: 'BehaviourTest123!',
      firstName: 'Rae',
      lastName: 'Scue',
    });
    expect(m.registerRescue.mock.calls[0][0]).toEqual({
      ownerUserId: 'usr-owner',
      rescue: expect.objectContaining({
        name: 'Happy Tails',
        // The org contact email is the form's rescueEmail, not the owner login email.
        email: 'hello@happytails.org',
        postcode: 'SW1A 1AA',
        country: 'GB',
        // Derived from the owner's name when the client does not send one.
        contactPerson: 'Rae Scue',
      }),
    });
  });

  it('passes through optional fields (phone, county, registration numbers, contactPerson)', async () => {
    m.registerRescueOwner.mockResolvedValueOnce({ user: { userId: 'usr-owner' } });
    m.registerRescue.mockResolvedValueOnce({ rescue: RESCUE });

    await post({
      ...FORM_BODY,
      phone: '020 7946 0958',
      county: 'Greater London',
      companiesHouseNumber: '00123456',
      charityRegistrationNumber: '1234567',
      contactPerson: 'R. Scue',
    });

    expect(m.registerRescue.mock.calls[0][0].rescue).toMatchObject({
      phone: '020 7946 0958',
      county: 'Greater London',
      companiesHouseNumber: '00123456',
      charityRegistrationNumber: '1234567',
      contactPerson: 'R. Scue',
    });
  });

  it.each([
    ['a missing owner name', { firstName: '' }],
    ['a weak password', { password: 'short' }],
    ['an invalid owner email', { email: 'nope' }],
    ['a missing organisation name', { name: '' }],
    ['a missing address', { address: '' }],
    ['a missing postcode', { postcode: '' }],
    ['a non ISO country code', { country: 'United Kingdom' }],
    ['a company number longer than the column', { companiesHouseNumber: '123456789' }],
    ['a charity number longer than the column', { charityRegistrationNumber: '1234567890123' }],
  ])('returns 400 and creates nothing for %s', async (_label, override) => {
    const res = await post({ ...FORM_BODY, ...override });

    expect(res.statusCode).toBe(400);
    expect(m.registerRescueOwner).not.toHaveBeenCalled();
    expect(m.registerRescue).not.toHaveBeenCalled();
  });

  it('answers an already-registered owner email exactly like a new sign-up and creates no rescue', async () => {
    m.registerRescueOwner.mockResolvedValueOnce({ user: { userId: 'usr-owner' } });
    m.registerRescue.mockResolvedValueOnce({ rescue: RESCUE });
    const fresh = await post(FORM_BODY);

    // The auth service answers an existing email with no user.
    m.registerRescueOwner.mockResolvedValueOnce({});
    const existing = await post(FORM_BODY);

    expect(existing.statusCode).toBe(fresh.statusCode);
    expect(existing.json()).toEqual(fresh.json());
    expect(m.registerRescue).toHaveBeenCalledTimes(1);
  });

  it('is rate limited per IP', async () => {
    m.registerRescueOwner.mockResolvedValue({});

    const statuses: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      statuses.push((await post(FORM_BODY)).statusCode);
    }

    expect(statuses).toContain(429);
  });
});
