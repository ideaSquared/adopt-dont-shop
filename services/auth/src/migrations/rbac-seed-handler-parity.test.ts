import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { MigrationBuilder } from 'node-pg-migrate';
import { describe, expect, it } from 'vitest';

// Guards the ADS-1235 / ADS-1304 class of RBAC drift: a gRPC handler gates
// on a permission string that no migration grants to any role. Every such
// handler bypasses the type-checker with a `'...' as Permission` cast (the
// literal isn't a member of the `Permission` union, so a plain assignment
// wouldn't compile) — `hasPermission`/`requirePermission` then 403 every
// non-super_admin caller, and nothing catches it because super_admin's authz
// short-circuit (packages/authz/src/has-permission.ts) masks the gap in
// manual testing.
//
// This test:
//   1. Scans every services/*/src/**/*.ts (excluding tests) for that cast
//      pattern and collects the permission literals it finds.
//   2. Runs every RBAC-seed migration in this directory — pure pgm.sql()
//      calls, no real Postgres needed — against a fake MigrationBuilder that
//      just records the SQL text, and extracts every permission granted to
//      at least one role from the recorded `role_permissions` inserts.
//   3. Asserts every cast literal is either granted to a role, or is on the
//      documented registry-only allowlist (a permission a service's signed
//      system principal stamps directly in gRPC metadata rather than
//      resolving from these tables — see 026/033/034's header comments).
//
// This deliberately does NOT re-check "is the literal a member of the
// `Permission` union" — once a handler drops the cast (this ticket's fix),
// that's already enforced by the ordinary TypeScript build
// (`pnpm ci:local:quick`'s type-check step) for free. The cast is exactly
// the mechanism that bypasses that check, which is why this test exists.

const MIGRATIONS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MIGRATIONS_DIR, '../../../..');
const SERVICES_DIR = join(REPO_ROOT, 'services');
const MIGRATION_FILENAME_PATTERN = /^\d{3}_[a-z0-9_]+\.ts$/;
const PERMISSION_CAST_PATTERN = /(['"])([-\w.:]+)\1\s+as\s+Permission\b/g;
// A real permission literal is `resource.action[.action...][:any]`, all
// lowercase segments — this excludes comment prose that happens to match
// the raw cast regex (e.g. this file's own header, which quotes the
// `'...' as Permission` pattern as an example).
const PERMISSION_LIKE_PATTERN = /^[a-z][a-z0-9_-]*(\.[a-z0-9_-]+)+(:any)?$/;

// Permissions deliberately granted to no role in the seed migrations — the
// only expected caller is a service's signed system principal, which
// carries the permission in its x-principal-token rather than resolving it
// from auth.role_permissions. See 026_seed_favoriters_list_permission.ts,
// 033_seed_rbac_drift_permissions.ts and 034's header comments.
const REGISTRY_ONLY_PERMISSIONS = new Set([
  'admin.users.broadcast',
  'pets.favoriters.list:any',
  'notifications.create',
]);

async function listTsFilesRecursively(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async entry => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') {
          return [];
        }
        return listTsFilesRecursively(full);
      }
      if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        return [full];
      }
      return [];
    })
  );
  return nested.flat();
}

async function collectAsPermissionCasts(): Promise<Set<string>> {
  const files = await listTsFilesRecursively(SERVICES_DIR);
  const literals = new Set<string>();
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(PERMISSION_CAST_PATTERN)) {
      if (PERMISSION_LIKE_PATTERN.test(match[2])) {
        literals.add(match[2]);
      }
    }
  }
  return literals;
}

function createSqlCapturingPgm(): { pgm: MigrationBuilder; calls: string[] } {
  const calls: string[] = [];
  // Every RBAC-seed migration in this directory only ever calls
  // `pgm.sql(...)` — a Proxy that records that call and no-ops everything
  // else means we don't have to hand-roll a full MigrationBuilder fake.
  const pgm = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'sql') {
          return (text: string): void => {
            calls.push(text);
          };
        }
        return () => undefined;
      },
    }
  ) as unknown as MigrationBuilder;
  return { pgm, calls };
}

async function collectGrantedPermissions(): Promise<Set<string>> {
  const entries = await readdir(MIGRATIONS_DIR);
  const files = entries.filter(f => MIGRATION_FILENAME_PATTERN.test(f)).sort();
  const granted = new Set<string>();

  for (const file of files) {
    const text = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    // Only run migrations that plausibly seed RBAC grants, and skip anything
    // with real side effects (async DB reads, secret-derived crypto) — this
    // test only needs the SQL text the seed migrations build with
    // pgm.sql(...); it must never touch a real database or process.env.
    const looksLikeRbacSeed =
      text.includes('auth.role_permissions') || text.includes('auth.permissions');
    const hasRealSideEffects = text.includes('pgm.db') || text.includes('requireHexSecret');
    if (!looksLikeRbacSeed || hasRealSideEffects) {
      continue;
    }

    const mod = (await import(`./${file}`)) as {
      up: (pgm: MigrationBuilder) => Promise<void>;
      down: (pgm: MigrationBuilder) => Promise<void>;
    };
    const { pgm, calls } = createSqlCapturingPgm();
    await mod.up(pgm);
    // Also exercise down() — not needed for the grant check below, but this
    // is the only place several older seed migrations (016-033) get
    // imported at all, so leaving it uncalled would silently drop their
    // down() out of the coverage universe entirely (see the coverage-floor
    // note in this test's own PR).
    const { pgm: downPgm } = createSqlCapturingPgm();
    await mod.down(downPgm);

    for (const sql of calls) {
      if (!sql.includes('role_permissions')) {
        continue;
      }
      const match = /permission_name\s*=\s*'([^']+)'/.exec(sql);
      if (match) {
        granted.add(match[1]);
      }
    }
  }

  return granted;
}

describe('RBAC seed/handler permission parity (ADS-1304)', () => {
  it('grants (or documents as registry-only) every "as Permission" cast literal in services/*/src', async () => {
    const [castLiterals, grantedPermissions] = await Promise.all([
      collectAsPermissionCasts(),
      collectGrantedPermissions(),
    ]);

    // Sanity check on the scan itself — if this trips, the file-walk or the
    // cast regex broke, not the RBAC seed.
    expect(castLiterals.size).toBeGreaterThan(0);
    expect(grantedPermissions.size).toBeGreaterThan(0);

    const undocumented = [...castLiterals]
      .filter(
        literal => !grantedPermissions.has(literal) && !REGISTRY_ONLY_PERMISSIONS.has(literal)
      )
      .sort();

    expect(undocumented).toEqual([]);
  });
});
