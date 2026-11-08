// Core of the one-shot "create the first super_admin" CLI (see
// bootstrap-admin.ts). Pure apart from the injected pool / nats / hasher, so
// it is unit-testable without Postgres or NATS.
//
// Why this exists: no API route can create the first admin (POST
// /api/v1/admin/users itself needs one) and db:seed refuses to run in
// production, so a fresh production stack otherwise has nobody who can verify
// rescues. Idempotency here is refusal: if an active super_admin already
// exists nothing is written.
//
// No auth.user_roles row is written: user_type is the user's primary role and
// loadPrincipal unions it with user_roles (see migration 016 / ADS-863), the
// same way the dev seed creates its super_admin.

import { randomUUID } from 'node:crypto';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';

import { withTransaction } from '@adopt-dont-shop/events';

import { assertEmail, assertPassword } from '../grpc/account-handlers.js';
import { HandlerError } from '../grpc/handlers.js';

export type BootstrapAdminInput = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
};

export type BootstrapAdminDeps = {
  pool: Pool;
  nats: NatsConnection;
  hash: (password: string) => Promise<string>;
};

// Arbitrary constant: serialises concurrent bootstrap runs so two operators
// cannot both pass the "no super_admin yet" check.
const BOOTSTRAP_LOCK_KEY = 7_301_001;

// A super_admin is the user_type OR an extra user_roles grant (loadPrincipal
// unions both), so the guard checks both.
const ACTIVE_SUPER_ADMIN_EXISTS = `
  SELECT u.user_id FROM auth.users u
  WHERE u.deleted_at IS NULL AND u.status = 'active'
    AND (
      u.user_type = 'super_admin'
      OR EXISTS (
        SELECT 1 FROM auth.user_roles ur
        INNER JOIN auth.roles r ON r.role_id = ur.role_id
        WHERE ur.user_id = u.user_id AND r.role_name = 'super_admin'
      )
    )
  LIMIT 1
`;

const EMAIL_TAKEN = `SELECT user_id FROM auth.users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`;

const INSERT_SUPER_ADMIN = `
  INSERT INTO auth.users (
    user_id, email, password, first_name, last_name,
    status, user_type, email_verified, phone_verified, two_factor_enabled,
    terms_accepted_at, privacy_policy_accepted_at,
    login_attempts, created_at, updated_at
  ) VALUES (
    $1, $2, $3, $4, $5,
    'active', $6, true, false, false,
    now(), now(),
    0, now(), now()
  )
`;

const validate = (input: BootstrapAdminInput): BootstrapAdminInput => {
  const email = input.email.trim();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  assertEmail(email);
  if (!firstName || !lastName) {
    throw new HandlerError('INVALID_ARGUMENT', 'first name and last name are required');
  }
  assertPassword(input.password);
  return { email, firstName, lastName, password: input.password };
};

export const bootstrapSuperAdmin = async (
  deps: BootstrapAdminDeps,
  rawInput: BootstrapAdminInput
): Promise<{ userId: string }> => {
  const input = validate(rawInput);
  const passwordHash = await deps.hash(input.password);
  const userId = randomUUID();

  await withTransaction({ pool: deps.pool, nats: deps.nats }, async ({ client, publish }) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [BOOTSTRAP_LOCK_KEY]);

    const existing = await client.query(ACTIVE_SUPER_ADMIN_EXISTS);
    if (existing.rows.length > 0) {
      throw new HandlerError(
        'ALREADY_EXISTS',
        'an active super_admin already exists; refusing to create another'
      );
    }
    const emailTaken = await client.query(EMAIL_TAKEN, [input.email]);
    if (emailTaken.rows.length > 0) {
      throw new HandlerError('ALREADY_EXISTS', 'a user with that email already exists');
    }

    await client.query(INSERT_SUPER_ADMIN, [
      userId,
      input.email,
      passwordHash,
      input.firstName,
      input.lastName,
      'super_admin',
    ]);

    publish({
      type: 'auth.actionTaken',
      id: `auth.actionTaken.${randomUUID()}`,
      payload: {
        eventId: randomUUID(),
        service: 'service.auth',
        subject: 'auth.actionTaken',
        aggregateType: 'user',
        aggregateId: userId,
        actorUserId: userId,
        action: 'bootstrap_super_admin',
        outcome: 'success',
        occurredAt: new Date().toISOString(),
        payload: { role: 'super_admin', source: 'bootstrap-admin-cli' },
      },
    });
  });

  return { userId };
};

// --- CLI input resolution ---------------------------------------------
// Flags win over env. The password is deliberately NOT a flag or env var
// (both are visible to other processes); the caller reads it from stdin.

export type CliIdentity = Omit<BootstrapAdminInput, 'password'>;

export const USAGE =
  'usage: node dist/db/bootstrap-admin.js --password-stdin ' +
  '[--email <email>] [--first-name <name>] [--last-name <name>]\n' +
  'flags fall back to BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_FIRST_NAME / ' +
  'BOOTSTRAP_ADMIN_LAST_NAME; the password is read from stdin';

export const resolveCliIdentity = (
  args: { email?: string; 'first-name'?: string; 'last-name'?: string; 'password-stdin'?: boolean },
  env: NodeJS.ProcessEnv
): CliIdentity => {
  if (!args['password-stdin']) {
    throw new HandlerError('INVALID_ARGUMENT', '--password-stdin is required');
  }
  return {
    email: args.email ?? env.BOOTSTRAP_ADMIN_EMAIL ?? '',
    firstName: args['first-name'] ?? env.BOOTSTRAP_ADMIN_FIRST_NAME ?? '',
    lastName: args['last-name'] ?? env.BOOTSTRAP_ADMIN_LAST_NAME ?? '',
  };
};
