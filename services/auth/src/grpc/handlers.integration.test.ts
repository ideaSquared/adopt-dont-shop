// Real-Postgres integration coverage for the RBAC seed → loadPrincipal →
// hasPermission path (ADS-1315).
//
// handlers.test.ts covers loadPrincipal against a mocked pool (asserting the
// SQL shape). This suite instead runs the ACTUAL migrations — including the
// RBAC seed migrations (016_seed_core_rbac.ts, 033_seed_rbac_drift_
// permissions.ts, …) that grant permissions to roles — against a real,
// throwaway schema, then exercises the full resolution chain a real login
// exercises: seed a user with a role → loadPrincipal resolves their
// permissions from `auth.role_permissions` → hasPermission (from
// @adopt-dont-shop/authz) evaluates the resolved Principal. A mocked-pool
// test can assert the SQL was called; only a real database can prove the
// seeded grants actually produce the intended allow/deny outcome.
//
// Skipped (not silently passed) when DATABASE_URL isn't set — see
// docs/testing.md for how to run these locally and in CI.
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { hasPermission } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import { makeNatsDouble, testPrincipal, withTestDatabase } from '@adopt-dont-shop/test-utils';

import { loadPrincipal, type HandlerDeps } from './handlers.js';

// Mirrors src/db/migrate.ts's own path resolution — this test file lives at
// src/grpc/, one directory below src/, same as src/db/.
const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

// Migration 027_encrypt_totp_secrets.ts reads ENCRYPTION_KEY directly from
// process.env to backfill existing TOTP secrets — the same env var
// `pnpm db:migrate` requires in every real environment. Set before any
// withTestDatabase() call below runs the migrations.
process.env.ENCRYPTION_KEY ??= 'a'.repeat(64);

// loadPrincipal only touches deps.pool; the rest of HandlerDeps is unused by
// it but required by the type, so these are inert stubs (never invoked) —
// the real repo convention for this, see handlers.test.ts's own deps builder.
function buildDeps(pool: HandlerDeps['pool']): HandlerDeps {
  return {
    pool,
    nats: makeNatsDouble().connection,
    passwordHasher: {
      compare: async () => false,
      hash: async () => 'unused',
    },
    tokenIssuer: {
      mint: async () => {
        throw new Error('tokenIssuer is not exercised by this test');
      },
      verifyAccess: async () => {
        throw new Error('tokenIssuer is not exercised by this test');
      },
      verifyRefresh: async () => {
        throw new Error('tokenIssuer is not exercised by this test');
      },
    },
    encryptionKey: 'a'.repeat(64),
  };
}

describe.skipIf(!process.env.DATABASE_URL)(
  'RBAC seed grants resolving through loadPrincipal / hasPermission (real Postgres)',
  () => {
    it('grants an adopter their seeded permissions and denies a rescue_staff-only permission', async () => {
      await withTestDatabase(
        {
          schemaPrefix: 'auth',
          exactSchemaName: true,
          migrationsDir: MIGRATIONS_DIR,
          registerTsxLoader: true,
        },
        async pool => {
          const deps = buildDeps(pool);
          const userId = randomUUID();

          await pool.query(
            `INSERT INTO auth.users (user_id, email, password, user_type)
             VALUES ($1, $2, 'hashed', 'adopter')`,
            [userId, `${userId}@example.test`]
          );

          const { roles, permissions } = await loadPrincipal(deps, userId);

          expect(roles).toEqual(['adopter']);

          // randomUUID() returns a plain string; UserId is a branded string
          // with no runtime representation, so a cast is the only way to
          // construct one — mirrors testPrincipal's own default in
          // principal-builders.ts.
          const principal = testPrincipal({
            userId: userId as UserId,
            roles,
            permissions,
          });

          // Seeded for `adopter` by 016_seed_core_rbac.ts.
          expect(hasPermission(principal, 'pets.read' as Permission)).toBe(true);
          // Seeded for `rescue_staff`, NOT `adopter` — proves the grant is
          // role-scoped, not a blanket allow.
          expect(hasPermission(principal, 'applications.approve' as Permission)).toBe(false);
        }
      );
    });

    it('grants a rescue_staff user permissions an adopter does not have', async () => {
      await withTestDatabase(
        {
          schemaPrefix: 'auth',
          exactSchemaName: true,
          migrationsDir: MIGRATIONS_DIR,
          registerTsxLoader: true,
        },
        async pool => {
          const deps = buildDeps(pool);
          const userId = randomUUID();

          await pool.query(
            `INSERT INTO auth.users (user_id, email, password, user_type)
             VALUES ($1, $2, 'hashed', 'rescue_staff')`,
            [userId, `${userId}@example.test`]
          );

          const { roles, permissions } = await loadPrincipal(deps, userId);
          // See the comment on the first test's testPrincipal() call for why
          // this cast is needed.
          const principal = testPrincipal({ userId: userId as UserId, roles, permissions });

          expect(hasPermission(principal, 'applications.approve' as Permission)).toBe(true);
          expect(hasPermission(principal, 'pets.create' as Permission)).toBe(true);
        }
      );
    });

    it('resolves no permissions (real NOT_FOUND) for a user that does not exist', async () => {
      await withTestDatabase(
        {
          schemaPrefix: 'auth',
          exactSchemaName: true,
          migrationsDir: MIGRATIONS_DIR,
          registerTsxLoader: true,
        },
        async pool => {
          const deps = buildDeps(pool);

          await expect(loadPrincipal(deps, randomUUID())).rejects.toThrow(/not found/);
        }
      );
    });
  }
);
