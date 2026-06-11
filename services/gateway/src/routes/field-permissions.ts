// REST → gRPC translation for /api/v1/field-permissions/*. Backed by
// service.auth, which owns the field_permissions table + the lib.types
// defaults the resolver overlays on top.
//
// Returns the monolith's `{ success, data, ... }` envelope so the
// existing lib.permissions frontend client (api-service.ts) keeps
// working unchanged.

import type { FastifyInstance } from 'fastify';

import {
  AuthV1,
  type AuthFieldPermission,
  type FieldPermissionOverrideInput,
} from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';

export type FieldPermissionsRoutesOptions = {
  client: AuthClient;
};

function resourceToProto(raw: string): AuthV1.FieldPermissionResource | null {
  switch (raw) {
    case 'users':
      return AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS;
    case 'pets':
      return AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_PETS;
    case 'applications':
      return AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_APPLICATIONS;
    case 'rescues':
      return AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_RESCUES;
    default:
      return null;
  }
}

function accessLevelToProto(raw: string): AuthV1.FieldAccessLevel | null {
  switch (raw) {
    case 'none':
      return AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_NONE;
    case 'read':
      return AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ;
    case 'write':
      return AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_WRITE;
    default:
      return null;
  }
}

const ACCESS_LEVEL_FROM_PROTO: Record<number, 'none' | 'read' | 'write'> = {
  [AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_NONE]: 'none',
  [AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_READ]: 'read',
  [AuthV1.FieldAccessLevel.FIELD_ACCESS_LEVEL_WRITE]: 'write',
};

const RESOURCE_FROM_PROTO: Record<number, 'users' | 'pets' | 'applications' | 'rescues'> = {
  [AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_USERS]: 'users',
  [AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_PETS]: 'pets',
  [AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_APPLICATIONS]: 'applications',
  [AuthV1.FieldPermissionResource.FIELD_PERMISSION_RESOURCE_RESCUES]: 'rescues',
};

// View shape lib.permissions / lib.api expect: snake_case keys mirroring
// the monolith's FieldPermissionRecord. Includes both human-readable
// resource / access_level strings AND keeps the numeric id as the
// frontend's existing types do.
function toView(o: AuthFieldPermission): Record<string, unknown> {
  return {
    field_permission_id: o.fieldPermissionId,
    resource: RESOURCE_FROM_PROTO[o.resource] ?? 'users',
    field_name: o.fieldName,
    role: o.role,
    access_level: ACCESS_LEVEL_FROM_PROTO[o.accessLevel] ?? 'none',
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  };
}

export const registerFieldPermissionsRoutes = async (
  app: FastifyInstance,
  opts: FieldPermissionsRoutesOptions
): Promise<void> => {
  const { client } = opts;

  // GET /api/v1/field-permissions/defaults — full defaults blob.
  app.get('/api/v1/field-permissions/defaults', async (req, reply) => {
    try {
      const res = await client.getFieldPermissionDefaults({}, buildMetadata(req));
      // The handler JSON-encodes the defaults blob; parse here so the
      // gateway response stays a normal object the SPA can consume.
      return reply.send({ success: true, data: JSON.parse(res.defaultsJson) });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // GET /api/v1/field-permissions/defaults/:resource/:role
  app.get<{ Params: { resource: string; role: string } }>(
    '/api/v1/field-permissions/defaults/:resource/:role',
    async (req, reply) => {
      const resource = resourceToProto(req.params.resource);
      if (resource === null) {
        return reply.code(400).send({ success: false, error: 'invalid resource' });
      }
      try {
        const res = await client.getFieldPermissionDefaultsForRole(
          { resource, role: req.params.role },
          buildMetadata(req)
        );
        return reply.send({ success: true, data: JSON.parse(res.accessMapJson) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/field-permissions/bulk — keep before the dynamic
  // /:resource handlers so Fastify's first-match-wins router picks the
  // static segment.
  app.post('/api/v1/field-permissions/bulk', async (req, reply) => {
    const body = (req.body ?? {}) as { overrides?: Array<Record<string, unknown>> };
    const overridesRaw = body.overrides ?? [];
    if (!Array.isArray(overridesRaw) || overridesRaw.length === 0) {
      return reply.code(400).send({ success: false, error: 'overrides must be a non-empty array' });
    }
    const overrides: FieldPermissionOverrideInput[] = [];
    for (const o of overridesRaw) {
      const resource = resourceToProto(String(o.resource ?? ''));
      const accessLevel = accessLevelToProto(String(o.access_level ?? o.accessLevel ?? ''));
      if (resource === null || accessLevel === null) {
        return reply.code(400).send({ success: false, error: 'invalid resource or access_level' });
      }
      overrides.push({
        resource,
        fieldName: String(o.field_name ?? o.fieldName ?? ''),
        role: String(o.role ?? ''),
        accessLevel,
      });
    }
    try {
      const res = await client.bulkUpsertFieldPermissions({ overrides }, buildMetadata(req));
      return reply.send({ success: true, data: res.overrides.map(toView) });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // POST /api/v1/field-permissions — single upsert.
  app.post('/api/v1/field-permissions', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const resource = resourceToProto(String(body.resource ?? ''));
    const accessLevel = accessLevelToProto(String(body.access_level ?? body.accessLevel ?? ''));
    if (resource === null || accessLevel === null) {
      return reply.code(400).send({ success: false, error: 'invalid resource or access_level' });
    }
    try {
      const res = await client.upsertFieldPermission(
        {
          resource,
          fieldName: String(body.field_name ?? body.fieldName ?? ''),
          role: String(body.role ?? ''),
          accessLevel,
        },
        buildMetadata(req)
      );
      if (res.override === undefined) {
        return reply.code(500).send({ success: false, error: 'no override returned' });
      }
      return reply.send({ success: true, data: toView(res.override) });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // GET /api/v1/field-permissions/:resource/:role — order matters,
  // must register BEFORE the bare /:resource route so the 3-segment
  // form wins.
  app.get<{ Params: { resource: string; role: string } }>(
    '/api/v1/field-permissions/:resource/:role',
    async (req, reply) => {
      const resource = resourceToProto(req.params.resource);
      if (resource === null) {
        return reply.code(400).send({ success: false, error: 'invalid resource' });
      }
      try {
        const res = await client.listFieldPermissionOverridesForRole(
          { resource, role: req.params.role },
          buildMetadata(req)
        );
        return reply.send({ success: true, data: res.overrides.map(toView) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // DELETE /api/v1/field-permissions/:resource/:role/:field_name
  app.delete<{ Params: { resource: string; role: string; field_name: string } }>(
    '/api/v1/field-permissions/:resource/:role/:field_name',
    async (req, reply) => {
      const resource = resourceToProto(req.params.resource);
      if (resource === null) {
        return reply.code(400).send({ success: false, error: 'invalid resource' });
      }
      try {
        const res = await client.deleteFieldPermission(
          { resource, role: req.params.role, fieldName: req.params.field_name },
          buildMetadata(req)
        );
        if (!res.deleted) {
          return reply
            .code(404)
            .send({ success: false, message: 'field permission override not found' });
        }
        return reply.send({ success: true, message: 'field permission override deleted' });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/field-permissions/:resource
  app.get<{ Params: { resource: string } }>(
    '/api/v1/field-permissions/:resource',
    async (req, reply) => {
      const resource = resourceToProto(req.params.resource);
      if (resource === null) {
        return reply.code(400).send({ success: false, error: 'invalid resource' });
      }
      try {
        const res = await client.listFieldPermissionOverrides({ resource }, buildMetadata(req));
        return reply.send({ success: true, data: res.overrides.map(toView) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------
