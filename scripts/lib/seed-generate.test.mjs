import { describe, expect, it } from 'vitest';

import { createSession } from './seed-api-client.mjs';
import { createGenerator, remainingStatusHops } from './seed-generate.mjs';
import * as personas from './seed-personas.mjs';

const BASE = 'http://gateway.test';

// A fake gateway: `routes` maps "METHOD /path" (query string stripped) to a
// handler returning [status, body]. Every call is recorded.
const fakeGateway = routes => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const { pathname, search } = new URL(url);
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, path: pathname, search, body, headers: init.headers ?? {} });
    const handler =
      routes[`${method} ${pathname}`] ??
      (pathname === '/api/v1/csrf-token' ? () => [200, { csrfToken: 'csrf-1' }] : undefined);
    if (!handler) {
      throw new Error(`fake gateway: no route for ${method} ${pathname}`);
    }
    const [status, json, setCookies = []] = handler({ body, search });
    return new Response(json === undefined ? null : JSON.stringify(json), {
      status,
      headers: setCookies.map(c => ['set-cookie', c]),
    });
  };
  return { fetchImpl, calls };
};

// Routes for a stack where every persona already exists and is in its final
// state — what a second `pnpm db:seed` sees.
const fullySeededRoutes = () => ({
  'POST /api/v1/auth/login': () => [200, {}, ['accessToken=at; HttpOnly']],
  'GET /api/v1/admin/rescues': ({ search }) => {
    const name = new URLSearchParams(search).get('search');
    return [200, { data: [{ rescue_id: `rescue-${name}`, name, status: 'verified' }] }];
  },
  'GET /api/v1/pets': ({ search }) => {
    const name = new URLSearchParams(search).get('search');
    const pet = personas.PETS.find(p => p.name === name);
    return [200, { data: [{ pet_id: `pet-${name}`, name, status: pet.status }] }];
  },
  'POST /api/v1/pets/pet-Buddy/favorite': () => [409, { error: 'already favourited' }],
  'POST /api/v1/pets/pet-Luna/favorite': () => [409, { error: 'already favourited' }],
  'GET /api/v1/applications': () => [
    200,
    { data: [{ id: 'app-1', petId: 'pet-Luna', status: 'under_review', version: 4 }] },
  ],
  'POST /api/v1/chats/enquiries': () => [200, { chat: { chatId: 'chat-1' } }],
  'GET /api/v1/chats/chat-1/messages': () => [200, { data: [{ messageId: 'm-1' }] }],
});

describe('remainingStatusHops', () => {
  it('walks a fresh (available) pet through the status machine to its seeded status', () => {
    expect(remainingStatusHops('available', 'available')).toEqual([]);
    expect(remainingStatusHops('available', 'pending')).toEqual(['pending']);
    expect(remainingStatusHops('available', 'adopted')).toEqual(['pending', 'adopted']);
    expect(remainingStatusHops('available', 'not_available')).toEqual(['not_available']);
  });

  it('resumes a pet a previous run left part-way along its path', () => {
    expect(remainingStatusHops('pending', 'adopted')).toEqual(['adopted']);
  });

  it('does nothing once the pet is already in its seeded status', () => {
    expect(remainingStatusHops('adopted', 'adopted')).toEqual([]);
  });

  it('returns null when the pet was moved off its path, so the seed leaves it alone', () => {
    expect(remainingStatusHops('not_available', 'adopted')).toBeNull();
  });

  it('rejects a seeded status it has no path to', () => {
    expect(() => remainingStatusHops('available', 'deceased')).toThrow(/no seed status path/);
  });
});

describe('createSession', () => {
  it('sends the CSRF double-submit header and the cookies the gateway set', async () => {
    const { fetchImpl, calls } = fakeGateway({
      'POST /api/v1/auth/login': () => [200, {}, ['accessToken=at-1; Path=/; HttpOnly']],
      'POST /api/v1/pets': () => [201, { data: {} }],
    });
    const session = createSession(BASE, fetchImpl);

    await session.post('/api/v1/auth/login', { email: 'a@b.c', password: 'x' });
    await session.post('/api/v1/pets', { name: 'Rex' });

    const create = calls.find(c => c.path === '/api/v1/pets');
    expect(create.headers['x-csrf-token']).toBe('csrf-1');
    expect(create.headers.cookie).toContain('accessToken=at-1');
  });

  it('throws with the status and body when a call fails', async () => {
    const { fetchImpl } = fakeGateway({
      'GET /api/v1/pets': () => [500, { error: 'internal_error' }],
    });
    const session = createSession(BASE, fetchImpl);

    await expect(session.get('/api/v1/pets')).rejects.toThrow(
      /GET \/api\/v1\/pets failed: 500 .*internal_error/
    );
  });
});

describe('createGenerator', () => {
  it('stops with a pointer to the SQL bootstrap when the super_admin cannot log in', async () => {
    const { fetchImpl } = fakeGateway({
      'POST /api/v1/auth/login': () => [401, { error: 'unauthenticated' }],
    });
    const generator = createGenerator({ baseUrl: BASE, password: 'pw', fetchImpl });

    await expect(generator.run(personas)).rejects.toThrow(/services\/auth `pnpm db:seed`/);
  });

  it('creates nothing when every persona already exists (a re-run is a no-op)', async () => {
    const { fetchImpl, calls } = fakeGateway(fullySeededRoutes());
    const generator = createGenerator({ baseUrl: BASE, password: 'pw', fetchImpl });

    const { petIds } = await generator.run(personas);

    expect(Object.keys(petIds)).toEqual(personas.PETS.map(p => p.name));
    const writes = calls
      .filter(c => c.method !== 'GET')
      .map(c => c.path)
      .filter(path => !path.endsWith('/favorite') && path !== '/api/v1/chats/enquiries');
    // Only logins: no account, rescue, pet, status, application or message writes.
    expect(new Set(writes)).toEqual(new Set(['/api/v1/auth/login']));
  });

  it('registers and verifies a missing adopter through the public sign-up flow', async () => {
    const created = new Set();
    const routes = {
      ...fullySeededRoutes(),
      'POST /api/v1/auth/login': ({ body }) =>
        body.email === 'emily.davis@yahoo.com' && !created.has(body.email)
          ? [401, { error: 'unauthenticated' }]
          : [200, {}, ['accessToken=at; HttpOnly']],
      'POST /api/v1/auth/register': () => [201, {}],
      'GET /api/v1/test/auth-token': () => [200, { verificationToken: 'verify-1' }],
      'POST /api/v1/auth/verify-email': ({ body }) => {
        created.add('emily.davis@yahoo.com');
        return [200, { verified: body.verificationToken === 'verify-1' }];
      },
    };
    const { fetchImpl, calls } = fakeGateway(routes);
    const generator = createGenerator({ baseUrl: BASE, password: 'pw', fetchImpl });

    await generator.run(personas);

    const register = calls.find(c => c.path === '/api/v1/auth/register');
    expect(register.body).toMatchObject({
      email: 'emily.davis@yahoo.com',
      password: 'pw',
      termsAccepted: true,
      privacyPolicyAccepted: true,
    });
    const verify = calls.find(c => c.path === '/api/v1/auth/verify-email');
    expect(verify.body).toEqual({ verificationToken: 'verify-1' });
  });

  it('creates a missing pet as its rescue staff and walks it to its seeded status', async () => {
    const routes = {
      ...fullySeededRoutes(),
      'GET /api/v1/pets': ({ search }) => {
        const name = new URLSearchParams(search).get('search');
        if (name === 'Max') {
          return [200, { data: [] }];
        }
        const pet = personas.PETS.find(p => p.name === name);
        return [200, { data: [{ pet_id: `pet-${name}`, name, status: pet.status }] }];
      },
      'POST /api/v1/pets': () => [201, { data: { pet_id: 'pet-Max', status: 'available' } }],
      'POST /api/v1/pets/pet-Max/status': () => [200, {}],
    };
    const { fetchImpl, calls } = fakeGateway(routes);
    const generator = createGenerator({ baseUrl: BASE, password: 'pw', fetchImpl });

    await generator.run(personas);

    const create = calls.find(c => c.method === 'POST' && c.path === '/api/v1/pets');
    expect(create.body).toMatchObject({
      name: 'Max',
      rescue_id: 'rescue-Paws Rescue',
      type: 'dog',
    });
    const hops = calls.filter(c => c.path === '/api/v1/pets/pet-Max/status').map(c => c.body);
    expect(hops.map(h => h.toStatus)).toEqual(['pending', 'adopted']);
  });

  it('starts the review of a freshly submitted application as the rescue reviewer', async () => {
    const routes = {
      ...fullySeededRoutes(),
      'GET /api/v1/applications': () => [200, { data: [] }],
      'POST /api/v1/applications': ({ body }) => [
        201,
        { data: { id: 'app-9', petId: body.petId, status: 'submitted', version: 2 } },
      ],
      'POST /api/v1/applications/app-9/review': () => [200, {}],
    };
    const { fetchImpl, calls } = fakeGateway(routes);
    const generator = createGenerator({ baseUrl: BASE, password: 'pw', fetchImpl });

    await generator.run(personas);

    const submit = calls.find(c => c.method === 'POST' && c.path === '/api/v1/applications');
    expect(submit.body).toEqual({ petId: 'pet-Luna' });
    const review = calls.find(c => c.path === '/api/v1/applications/app-9/review');
    expect(review.body).toEqual({ expectedVersion: 2 });
  });
});

describe('seed persona contract', () => {
  it('creates exactly the accounts the dev login panel offers', async () => {
    const { seededDevUsers } = await import('../../packages/lib.dev-tools/src/data/seededUsers.ts');
    const seeded = [
      personas.SUPER_ADMIN_EMAIL,
      ...personas.ADMINS.map(a => a.email),
      ...personas.STAFF.map(s => s.email),
      ...personas.ADOPTERS.map(a => a.email),
    ];

    expect(new Set(seededDevUsers.map(u => u.email))).toEqual(new Set(seeded));
  });
});
