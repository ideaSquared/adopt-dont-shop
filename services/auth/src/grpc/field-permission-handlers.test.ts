import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import { AuthV1 } from '@adopt-dont-shop/proto';

import type { HandlerDeps } from './handlers.js';
import {
  bulkUpsertFieldPermissions,
  deleteFieldPermission,
  getFieldPermissionDefaults,
  getFieldPermissionDefaultsForRole,
  listFieldPermissionOverrides,
  listFieldPermissionOverridesForRole,
  upsertFieldPermission,
} from './field-permission-handlers.js';

const ADMIN: Principal = {
  userId: 'usr-admin' as UserId,
  roles: ['admin'],
  permissions: [
    'admin.field_permissions.read' as Permission,
    'admin.field_permissions.write' as Permission,
  ],
};

const READER: Principal = {
  userId: 'usr-reader' as UserId,
  roles: ['admin'],
  permissions: ['admin.field_permissions.read' as Permission],
};

const NO_PERMS: Principal = {
  userId: 'usr-nobody' as UserId,
  roles: [],
  permissions: [],
};

function makeMocks() {
  const clientScript: Array<{ rows: unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [] };
      }
      const next = clientScript.shift();
      if (!next) {
        throw new Error(`client.query unscripted: ${sql.slice(0, 80)}`);
      }
      return next;
    }),
    release: vi.fn(),
  };
  const poolScript: Array<{ rows: unknown[]; rowCount?: number }> = [];
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(async () => poolScript.shift() ?? { rows: [], rowCount: 0 }),
  };
  const natsPublish = vi.fn();
  // JetStream publish routes to the same spy so existing publish assertions
  // keep working; withTransaction now publishes via nats.jetstream().publish().
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
    passwordHasher: {
      hash: vi.fn(),
      compare: vi.fn(),
    } as unknown as HandlerDeps['passwordHasher'],
    tokenIssuer: {
      mint: vi.fn(),
      verifyAccess: vi.fn(),
      verifyRefresh: vi.fn(),
    } as unknown as HandlerDeps['tokenIssuer'],
  };
  return {
    pool: pool as unknown as Pool,
    client: client as unknown as PoolClient,
    poolMock: pool,
    clientMock: client,
    clientScript,
    poolScript,
    deps,
  };
}

function row(over: Record<string, unknown> = {}) {
  return {
    field_permission_id: 1,
    resource: 'users',
    field_name: 'firstName',
    role: 'admin',
    access_level: 'write',
    created_at: new Date('2026-06-01T00:00:00Z'),
    updated_at: new Date('2026-06-01T00:00:00Z'),
    ...over,
  };
}

describe('getFieldPermissionDefaults', () => {
  it('returns the JSON-encoded defaults blob', async () => {
    const { deps } = makeMocks();
    const res = await getFieldPermissionDefaults(deps, ADMIN, {});
    const parsed = JSON.parse(res.defaultsJson) as Record<string, unknown>;
    expect(parsed.users).toBeDefined();
    expect(parsed.pets).toBeDefined();
    expect(parsed.applications).toBeDefined();
    expect(parsed.rescues).toBeDefined();
  });

  it('rejects callers without the read permission', async () => {
    const { deps } = makeMocks();
    await expect(getFieldPermissionDefaults(deps, NO_PERMS, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});

describe('getFieldPermissionDefaultsForRole', () => {
  it('returns the access map for a (resource, role)', async () => {
    const { deps } = makeMocks();
    const res = await getFieldPermissionDefaultsForRole(deps, READER, {
      resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
      role: 'admin',
    });
    const parsed = JSON.parse(res.accessMapJson) as Record<string, string>;
    // Sensitive fields always resolve to 'none' regardless of defaults.
    expect(parsed.password).toBe('none');
    // First name is write-able for admin.
    expect(parsed.firstName).toBe('write');
  });

  it('rejects an unknown role with INVALID_ARGUMENT', async () => {
    const { deps } = makeMocks();
    await expect(
      getFieldPermissionDefaultsForRole(deps, READER, {
        resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
        role: 'nonexistent',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects an unspecified resource with INVALID_ARGUMENT', async () => {
    const { deps } = makeMocks();
    await expect(
      getFieldPermissionDefaultsForRole(deps, READER, {
        resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_UNSPECIFIED,
        role: 'admin',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});

describe('listFieldPermissionOverrides', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('queries by resource and maps rows to proto', async () => {
    mocks.poolScript.push({ rows: [row(), row({ field_permission_id: 2, role: 'moderator' })] });
    const res = await listFieldPermissionOverrides(mocks.deps, READER, {
      resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
    });
    expect(res.overrides).toHaveLength(2);
    expect(res.overrides[0]).toMatchObject({
      fieldPermissionId: 1,
      resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
      fieldName: 'firstName',
      role: 'admin',
      accessLevel: AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_WRITE,
    });
    // SQL filters by resource and deleted_at IS NULL.
    const [sql, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('resource = $1');
    expect(sql).toContain('deleted_at IS NULL');
    expect(params).toEqual(['users']);
  });
});

describe('listFieldPermissionOverridesForRole', () => {
  it('queries by (resource, role)', async () => {
    const mocks = makeMocks();
    mocks.poolScript.push({ rows: [row()] });
    await listFieldPermissionOverridesForRole(mocks.deps, READER, {
      resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
      role: 'admin',
    });
    const [, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual(['users', 'admin']);
  });
});

describe('upsertFieldPermission', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('writes the override inside a transaction and returns the row', async () => {
    mocks.clientScript.push({ rows: [row({ access_level: 'read' })] });
    const res = await upsertFieldPermission(mocks.deps, ADMIN, {
      resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
      fieldName: 'firstName',
      role: 'admin',
      accessLevel: AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ,
    });
    expect(res.override).toMatchObject({
      fieldName: 'firstName',
      accessLevel: AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ,
    });
    // Transaction was opened.
    const beginCalls = mocks.clientMock.query.mock.calls.filter(c =>
      String(c[0]).trim().toUpperCase().startsWith('BEGIN')
    );
    expect(beginCalls).toHaveLength(1);
  });

  it('rejects sensitive field overrides with INVALID_ARGUMENT', async () => {
    await expect(
      upsertFieldPermission(mocks.deps, ADMIN, {
        resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
        fieldName: 'password',
        role: 'admin',
        accessLevel: AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_WRITE,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(mocks.poolMock.connect).not.toHaveBeenCalled();
  });

  it('rejects unknown field names with INVALID_ARGUMENT', async () => {
    await expect(
      upsertFieldPermission(mocks.deps, ADMIN, {
        resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
        fieldName: 'noSuchField',
        role: 'admin',
        accessLevel: AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects empty field_name with INVALID_ARGUMENT', async () => {
    await expect(
      upsertFieldPermission(mocks.deps, ADMIN, {
        resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
        fieldName: '   ',
        role: 'admin',
        accessLevel: AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects callers without write permission', async () => {
    await expect(
      upsertFieldPermission(mocks.deps, READER, {
        resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
        fieldName: 'firstName',
        role: 'admin',
        accessLevel: AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

describe('bulkUpsertFieldPermissions', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('writes every override inside a single transaction', async () => {
    mocks.clientScript.push({ rows: [row({ field_permission_id: 1 })] });
    mocks.clientScript.push({ rows: [row({ field_permission_id: 2, role: 'moderator' })] });

    const res = await bulkUpsertFieldPermissions(mocks.deps, ADMIN, {
      overrides: [
        {
          resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
          fieldName: 'firstName',
          role: 'admin',
          accessLevel: AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ,
        },
        {
          resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
          fieldName: 'firstName',
          role: 'moderator',
          accessLevel: AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ,
        },
      ],
    });

    expect(res.overrides).toHaveLength(2);
    const begins = mocks.clientMock.query.mock.calls.filter(c =>
      String(c[0]).trim().toUpperCase().startsWith('BEGIN')
    );
    expect(begins).toHaveLength(1);
  });

  it('refuses the whole batch when any one entry is sensitive', async () => {
    await expect(
      bulkUpsertFieldPermissions(mocks.deps, ADMIN, {
        overrides: [
          {
            resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
            fieldName: 'firstName',
            role: 'admin',
            accessLevel: AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ,
          },
          {
            resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
            fieldName: 'password',
            role: 'admin',
            accessLevel: AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_WRITE,
          },
        ],
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(mocks.poolMock.connect).not.toHaveBeenCalled();
  });

  it('rejects empty batches with INVALID_ARGUMENT', async () => {
    await expect(
      bulkUpsertFieldPermissions(mocks.deps, ADMIN, { overrides: [] })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});

describe('deleteFieldPermission', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('returns deleted=true when a row was soft-deleted', async () => {
    mocks.poolScript.push({ rows: [{ field_permission_id: 1 }], rowCount: 1 });
    const res = await deleteFieldPermission(mocks.deps, ADMIN, {
      resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
      fieldName: 'firstName',
      role: 'admin',
    });
    expect(res.deleted).toBe(true);
    const [sql] = mocks.poolMock.query.mock.calls[0] as [string];
    expect(sql).toContain('UPDATE field_permissions');
    expect(sql).toContain('SET deleted_at = now()');
  });

  it('returns deleted=false when no row matched', async () => {
    mocks.poolScript.push({ rows: [], rowCount: 0 });
    const res = await deleteFieldPermission(mocks.deps, ADMIN, {
      resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
      fieldName: 'firstName',
      role: 'admin',
    });
    expect(res.deleted).toBe(false);
  });

  it('rejects callers without write permission', async () => {
    await expect(
      deleteFieldPermission(mocks.deps, READER, {
        resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
        fieldName: 'firstName',
        role: 'admin',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});
