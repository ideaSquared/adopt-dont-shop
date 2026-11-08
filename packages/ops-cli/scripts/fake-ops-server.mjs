#!/usr/bin/env node
// Dev aid: a tiny stand-in for service.ops that serves canned, contract-valid
// responses on 127.0.0.1:4100, so you can try `pnpm ops` with nothing else
// running. Not a test double for the real server; it is deliberately dumb.
//
//   node packages/ops-cli/scripts/fake-ops-server.mjs
//   pnpm ops login && pnpm ops pets

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.FAKE_OPS_PORT ?? 4100);
const HOUR = 3_600_000;
const iso = ms => new Date(ms).toISOString();

const PET = 'adopt_dont_shop.pets.v1';
const field = (name, jsonName, kind, extra = {}) => ({
  name,
  jsonName,
  kind,
  repeated: false,
  optional: false,
  sensitivity: null,
  ...extra,
});

const catalog = {
  env: 'dev',
  services: [
    {
      name: 'pets',
      fullName: `${PET}.PetService`,
      methods: [
        {
          command: 'list',
          rpc: 'pets.List',
          kind: 'read',
          dryRun: null,
          summary: 'List pets, optionally filtered by status',
          inputType: `${PET}.ListPetsRequest`,
          outputType: `${PET}.ListPetsResponse`,
          piiRequestFields: [],
        },
        {
          command: 'get',
          rpc: 'pets.Get',
          kind: 'read',
          dryRun: null,
          summary: 'Fetch one pet by id',
          inputType: `${PET}.GetPetRequest`,
          outputType: `${PET}.GetPetResponse`,
          piiRequestFields: [],
        },
        {
          command: 'update-status',
          rpc: 'pets.UpdateStatus',
          kind: 'write',
          dryRun: 'rollback',
          summary: "Change a pet's adoption status",
          inputType: `${PET}.UpdateStatusRequest`,
          outputType: `${PET}.GetPetResponse`,
          piiRequestFields: [],
        },
        {
          command: 'announce',
          rpc: 'pets.Announce',
          kind: 'write',
          dryRun: 'preview-only',
          summary: 'Email subscribers about a pet',
          inputType: `${PET}.GetPetRequest`,
          outputType: `${PET}.GetPetResponse`,
          piiRequestFields: [],
        },
      ],
    },
    {
      name: 'users',
      fullName: 'adopt_dont_shop.auth.v1.UserService',
      methods: [
        {
          command: 'find',
          rpc: 'users.Find',
          kind: 'read',
          dryRun: null,
          summary: 'Find a user by email or id',
          inputType: `${PET}.FindUserRequest`,
          outputType: `${PET}.GetPetResponse`,
          piiRequestFields: ['email'],
        },
      ],
    },
  ],
  messages: {
    [`${PET}.ListPetsRequest`]: {
      fullName: `${PET}.ListPetsRequest`,
      fields: [
        field('status', 'status', 'enum', { typeName: `${PET}.PetStatus`, optional: true }),
        field('limit', 'limit', 'scalar', { scalarType: 'int32', optional: true }),
      ],
    },
    [`${PET}.GetPetRequest`]: {
      fullName: `${PET}.GetPetRequest`,
      fields: [
        field('pet_id', 'petId', 'scalar', { scalarType: 'string', comment: 'The pet to fetch' }),
      ],
    },
    [`${PET}.UpdateStatusRequest`]: {
      fullName: `${PET}.UpdateStatusRequest`,
      fields: [
        field('pet_id', 'petId', 'scalar', { scalarType: 'string' }),
        field('status', 'status', 'enum', { typeName: `${PET}.PetStatus` }),
        field('notify_adopter', 'notifyAdopter', 'scalar', { scalarType: 'bool', optional: true }),
      ],
    },
    [`${PET}.FindUserRequest`]: {
      fullName: `${PET}.FindUserRequest`,
      fields: [
        field('email', 'email', 'scalar', {
          scalarType: 'string',
          sensitivity: 'PII',
          optional: true,
        }),
        field('user_id', 'userId', 'scalar', { scalarType: 'string', optional: true }),
      ],
    },
    [`${PET}.ListPetsResponse`]: {
      fullName: `${PET}.ListPetsResponse`,
      fields: [
        field('pets', 'pets', 'message', { typeName: `${PET}.Pet`, repeated: true }),
        field('total', 'total', 'scalar', { scalarType: 'int32' }),
      ],
    },
    [`${PET}.GetPetResponse`]: {
      fullName: `${PET}.GetPetResponse`,
      fields: [field('pet', 'pet', 'message', { typeName: `${PET}.Pet` })],
    },
    [`${PET}.Pet`]: {
      fullName: `${PET}.Pet`,
      fields: [
        field('pet_id', 'petId', 'scalar', { scalarType: 'string' }),
        field('name', 'name', 'scalar', { scalarType: 'string' }),
        field('status', 'status', 'enum', { typeName: `${PET}.PetStatus` }),
        field('contact_email', 'contactEmail', 'scalar', {
          scalarType: 'string',
          sensitivity: 'PII',
        }),
      ],
    },
  },
  enums: {
    [`${PET}.PetStatus`]: {
      fullName: `${PET}.PetStatus`,
      values: ['UNSPECIFIED', 'AVAILABLE', 'PENDING', 'ADOPTED', 'ARCHIVED'].map((n, number) => ({
        name: `PET_STATUS_${n}`,
        number,
      })),
    },
  },
};

const pets = [
  ['Biscuit', 'PET_STATUS_AVAILABLE', 'biscuit@example.org'],
  ['Marmalade', 'PET_STATUS_PENDING', 'marmalade@example.org'],
  ['Tilly', 'PET_STATUS_ADOPTED', 'tilly@example.org'],
  ['Pickle', 'PET_STATUS_AVAILABLE', 'pickle@example.org'],
].map(([name, status, contactEmail], i) => ({
  petId: `0b1c2d3e-0000-4000-8000-00000000000${i + 1}`,
  name,
  status,
  contactEmail,
  createdAt: iso(Date.UTC(2026, 9, 12, 14, 3) - i * 86_400_000),
  ageMonths: 6 + i * 5,
  vaccinated: i % 2 === 0,
}));

const sessions = new Map();
let unlocks = [];
const plans = new Map();

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(body === undefined ? undefined : JSON.stringify(body));
};
const fail = (res, status, code, message, hint) =>
  send(res, status, { error: { code, message, ...(hint ? { hint } : {}) } });
const readBody = req =>
  new Promise(resolve => {
    let text = '';
    req.on('data', c => (text += c));
    req.on('end', () => resolve(text ? JSON.parse(text) : {}));
  });

const makeSession = login => {
  const session = {
    token: `${randomUUID()}${randomUUID()}`.replace(/-/g, ''),
    expiresAt: iso(Date.now() + 8 * HOUR),
    operator: { operatorId: randomUUID(), login, name: null },
  };
  sessions.set(session.token, session);
  return session;
};

const mask = (value, revealed, path = '', hidden = []) => {
  if (Array.isArray(value)) return value.map((v, i) => mask(v, revealed, `${path}[${i}]`, hidden));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => {
        const p = path ? `${path}.${k}` : k;
        if (k === 'contactEmail' && !revealed) {
          hidden.push(p);
          return [k, { $hidden: true }];
        }
        return [k, mask(v, revealed, p, hidden)];
      })
    );
  }
  return value;
};

const respond = (res, kind, rpc, response, extra = {}) => {
  const hidden = [];
  const revealed = unlocks.some(u => Date.parse(u.expiresAt) > Date.now());
  const masked = mask(response, revealed, '', hidden);
  send(res, 200, {
    kind,
    rpc,
    env: 'dev',
    hidden,
    unlockable: hidden.length > 0 ? { subjectType: 'any', subjectId: null } : null,
    revealedBy: revealed ? unlocks[0].unlockId : null,
    durationMs: 12 + Math.round(Math.random() * 30),
    ...(kind === 'result'
      ? { response: masked }
      : { request: extra.request, response: masked, ...extra.plan }),
  });
};

const invoke = async (req, res) => {
  const { rpc, request = {}, mode = 'preview', planId } = await readBody(req);
  if (rpc === 'pets.List') {
    const rows = request.status ? pets.filter(p => p.status === request.status) : pets;
    return respond(res, 'result', rpc, { pets: rows, total: rows.length });
  }
  if (rpc === 'pets.Get') {
    const pet = pets.find(p => p.petId === request.petId);
    return pet
      ? respond(res, 'result', rpc, { pet })
      : fail(res, 404, 'NOT_FOUND', 'pet not found');
  }
  if (rpc === 'users.Find') {
    const revealed = unlocks.some(u => Date.parse(u.expiresAt) > Date.now());
    if (request.email && !revealed)
      return fail(
        res,
        403,
        'UNLOCK_REQUIRED',
        'Looking up by email needs an unlock.',
        'Run `pnpm ops unlock any`'
      );
    return respond(res, 'result', rpc, { pet: pets[0] });
  }
  if (rpc === 'pets.UpdateStatus' || rpc === 'pets.Announce') {
    const pet = pets.find(p => p.petId === request.petId) ?? pets[0];
    const next = { ...pet, status: request.status ?? pet.status };
    if (mode === 'preview') {
      const id = randomUUID();
      plans.set(id, rpc);
      const dryRun = rpc === 'pets.Announce' ? 'preview-only' : 'rollback';
      return respond(res, 'plan', rpc, dryRun === 'preview-only' ? null : { pet: next }, {
        request,
        plan: {
          planId: id,
          expiresAt: iso(Date.now() + 10 * 60_000),
          dryRun,
          warnings:
            dryRun === 'preview-only'
              ? ['Sends email to 214 subscribers - cannot be simulated']
              : [],
          ...(dryRun === 'preview-only' ? { response: null } : {}),
        },
      });
    }
    if (!planId || !plans.delete(planId))
      return fail(res, 428, 'PLAN_REQUIRED', 'Run a preview first.');
    return respond(res, 'result', rpc, { pet: next });
  }
  return fail(res, 403, 'NOT_ENABLED', `${rpc} is not enabled`);
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const route = `${req.method} ${url.pathname}`;
  if (route === 'GET /health/ready') return send(res, 200, { ok: true });
  if (route === 'POST /v1/login/local')
    return send(res, 200, { session: makeSession((await readBody(req)).login) });
  const session = sessions.get((req.headers.authorization ?? '').replace('Bearer ', ''));
  if (!session) return fail(res, 401, 'UNAUTHENTICATED', 'Sign in first.', 'Run `pnpm ops login`');
  if (route === 'GET /v1/whoami')
    return send(res, 200, {
      env: 'dev',
      operator: session.operator,
      sessionExpiresAt: session.expiresAt,
      unlocks,
    });
  if (route === 'GET /v1/catalog') return send(res, 200, catalog);
  if (route === 'POST /v1/invoke') return invoke(req, res);
  if (route === 'POST /v1/logout') return send(res, 204);
  if (route === 'GET /v1/unlocks') return send(res, 200, { unlocks });
  if (route === 'DELETE /v1/unlocks') return ((unlocks = []), send(res, 204));
  if (route === 'POST /v1/unlocks') {
    const b = await readBody(req);
    const unlock = {
      unlockId: randomUUID(),
      subjectType: b.subjectType,
      subjectId: b.subjectId,
      reason: b.reason,
      ticket: b.ticket,
      createdAt: iso(Date.now()),
      expiresAt: iso(Date.now() + (b.ttlMinutes ?? 30) * 60_000),
    };
    unlocks = [...unlocks, unlock];
    return send(res, 200, { unlock });
  }
  if (route === 'GET /v1/history') {
    return send(res, 200, {
      entries: [
        {
          at: iso(Date.now() - 300_000),
          rpc: 'pets.List',
          kind: 'read',
          mode: 'run',
          outcome: 'ok',
          errorCode: null,
          revealedFields: [],
        },
        {
          at: iso(Date.now() - 120_000),
          rpc: 'pets.UpdateStatus',
          kind: 'write',
          mode: 'preview',
          outcome: 'ok',
          errorCode: null,
          revealedFields: [],
        },
      ],
    });
  }
  return fail(res, 404, 'NOT_FOUND', `no route ${route}`);
});

server.listen(PORT, '127.0.0.1', () =>
  process.stdout.write(`fake service.ops on http://127.0.0.1:${PORT}\n`)
);
