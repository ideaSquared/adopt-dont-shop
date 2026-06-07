import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthV1 } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';

import { registerFieldPermissionsRoutes } from './field-permissions.js';

function makeClient(): {
  client: AuthClient;
  mocks: {
    getFieldPermissionDefaults: ReturnType<typeof vi.fn>;
    getFieldPermissionDefaultsForRole: ReturnType<typeof vi.fn>;
    listFieldPermissionOverrides: ReturnType<typeof vi.fn>;
    listFieldPermissionOverridesForRole: ReturnType<typeof vi.fn>;
    upsertFieldPermission: ReturnType<typeof vi.fn>;
    bulkUpsertFieldPermissions: ReturnType<typeof vi.fn>;
    deleteFieldPermission: ReturnType<typeof vi.fn>;
  };
} {
  const mocks = {
    getFieldPermissionDefaults: vi.fn(),
    getFieldPermissionDefaultsForRole: vi.fn(),
    listFieldPermissionOverrides: vi.fn(),
    listFieldPermissionOverridesForRole: vi.fn(),
    upsertFieldPermission: vi.fn(),
    bulkUpsertFieldPermissions: vi.fn(),
    deleteFieldPermission: vi.fn(),
  };
  const client = mocks as unknown as AuthClient;
  return { client, mocks };
}

const ADMIN_HEADERS = {
  'x-user-id': 'usr-admin',
  'x-user-roles': 'admin',
  'x-user-permissions': 'admin.field_permissions.read,admin.field_permissions.write',
};

const OVERRIDE_FIXTURE = {
  fieldPermissionId: 1,
  resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
  fieldName: 'firstName',
  role: 'admin',
  accessLevel: AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('field-permissions gateway routes', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeClient>['mocks'];

  beforeEach(async () => {
    app = Fastify({ logger: false });
    const { client, mocks: m } = makeClient();
    mocks = m;
    await registerFieldPermissionsRoutes(app, { client });
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /defaults returns the parsed defaults blob', async () => {
    mocks.getFieldPermissionDefaults.mockResolvedValue({
      defaultsJson: JSON.stringify({ users: { admin: { firstName: 'write' } } }),
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/field-permissions/defaults',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { success: boolean; data: Record<string, unknown> };
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({ users: { admin: { firstName: 'write' } } });
  });

  it('GET /defaults/:resource/:role passes the resource enum + role string', async () => {
    mocks.getFieldPermissionDefaultsForRole.mockResolvedValue({
      accessMapJson: JSON.stringify({ firstName: 'read' }),
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/field-permissions/defaults/users/moderator',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ success: true, data: { firstName: 'read' } });
    const [grpcReq] = mocks.getFieldPermissionDefaultsForRole.mock.calls[0];
    expect(grpcReq).toEqual({
      resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
      role: 'moderator',
    });
  });

  it('GET /defaults/:resource/:role rejects an unknown resource with 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/field-permissions/defaults/widgets/admin',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(400);
    expect(mocks.getFieldPermissionDefaultsForRole).not.toHaveBeenCalled();
  });

  it('GET /:resource returns overrides for a resource with snake_case keys', async () => {
    mocks.listFieldPermissionOverrides.mockResolvedValue({ overrides: [OVERRIDE_FIXTURE] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/field-permissions/users',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { data: Array<Record<string, unknown>> };
    expect(json.data[0]).toMatchObject({
      field_permission_id: 1,
      resource: 'users',
      field_name: 'firstName',
      role: 'admin',
      access_level: 'read',
    });
  });

  it('GET /:resource/:role passes both segments to the gRPC call', async () => {
    mocks.listFieldPermissionOverridesForRole.mockResolvedValue({ overrides: [] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/field-permissions/users/admin',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.listFieldPermissionOverridesForRole.mock.calls[0][0]).toEqual({
      resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
      role: 'admin',
    });
  });

  it('POST / upserts a single override (snake_case body)', async () => {
    mocks.upsertFieldPermission.mockResolvedValue({ override: OVERRIDE_FIXTURE });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/field-permissions',
      headers: ADMIN_HEADERS,
      payload: {
        resource: 'users',
        field_name: 'firstName',
        role: 'admin',
        access_level: 'read',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.upsertFieldPermission.mock.calls[0][0]).toEqual({
      resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
      fieldName: 'firstName',
      role: 'admin',
      accessLevel: AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ,
    });
  });

  it('POST / accepts camelCase body too', async () => {
    mocks.upsertFieldPermission.mockResolvedValue({ override: OVERRIDE_FIXTURE });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/field-permissions',
      headers: ADMIN_HEADERS,
      payload: {
        resource: 'users',
        fieldName: 'firstName',
        role: 'admin',
        accessLevel: 'read',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.upsertFieldPermission.mock.calls[0][0]).toMatchObject({
      fieldName: 'firstName',
      accessLevel: AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ,
    });
  });

  it('POST / rejects invalid access_level with 400 before hitting gRPC', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/field-permissions',
      headers: ADMIN_HEADERS,
      payload: { resource: 'users', field_name: 'x', role: 'admin', access_level: 'rwx' },
    });
    expect(res.statusCode).toBe(400);
    expect(mocks.upsertFieldPermission).not.toHaveBeenCalled();
  });

  it('POST /bulk routes to bulk endpoint (not single upsert)', async () => {
    mocks.bulkUpsertFieldPermissions.mockResolvedValue({ overrides: [OVERRIDE_FIXTURE] });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/field-permissions/bulk',
      headers: ADMIN_HEADERS,
      payload: {
        overrides: [
          { resource: 'users', field_name: 'firstName', role: 'admin', access_level: 'read' },
        ],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.bulkUpsertFieldPermissions).toHaveBeenCalled();
    expect(mocks.upsertFieldPermission).not.toHaveBeenCalled();
  });

  it('POST /bulk rejects empty arrays with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/field-permissions/bulk',
      headers: ADMIN_HEADERS,
      payload: { overrides: [] },
    });
    expect(res.statusCode).toBe(400);
    expect(mocks.bulkUpsertFieldPermissions).not.toHaveBeenCalled();
  });

  it('DELETE /:resource/:role/:field_name returns the success envelope on success', async () => {
    mocks.deleteFieldPermission.mockResolvedValue({ deleted: true });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/field-permissions/users/admin/firstName',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.deleteFieldPermission.mock.calls[0][0]).toEqual({
      resource: AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS,
      role: 'admin',
      fieldName: 'firstName',
    });
  });

  it('DELETE returns 404 when no row matched', async () => {
    mocks.deleteFieldPermission.mockResolvedValue({ deleted: false });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/field-permissions/users/admin/firstName',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(404);
  });

  it('maps gRPC INVALID_ARGUMENT → 400 on upsert', async () => {
    mocks.upsertFieldPermission.mockRejectedValue({
      code: grpcStatus.INVALID_ARGUMENT,
      details: 'cannot override sensitive fields: users.password',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/field-permissions',
      headers: ADMIN_HEADERS,
      payload: {
        resource: 'users',
        field_name: 'password',
        role: 'admin',
        access_level: 'write',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ success: false });
  });

  it('maps gRPC PERMISSION_DENIED → 403', async () => {
    mocks.listFieldPermissionOverrides.mockRejectedValue({
      code: grpcStatus.PERMISSION_DENIED,
      details: 'nope',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/field-permissions/users',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(403);
  });
});
