/**
 * Behaviour tests for FieldPermissionService (field-permission.service).
 *
 * FieldPermission is a security-sensitive configuration surface — it controls
 * which roles can read/write individual fields on key resources. We verify:
 *   - getByResource / getByResourceAndRole query correctly
 *   - upsert creates or updates the record and clears the cache
 *   - deleteOverride removes rows and clears the cache
 *   - deleteAllForRole removes all rows for a role/resource pair
 *
 * All DB calls are stubbed. AuditLog.create is mocked to prevent writes.
 * clearFieldPermissionCache is verified via spy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/FieldPermission', () => {
  const FieldAccessLevel = { NONE: 'none', READ: 'read', WRITE: 'write' };
  const FieldPermissionResource = {
    USERS: 'users',
    PETS: 'pets',
    APPLICATIONS: 'applications',
    RESCUES: 'rescues',
  };
  const mockInstance = {
    update: vi.fn().mockResolvedValue({ field_permission_id: 1 }),
  };
  return {
    default: {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      destroy: vi.fn(),
    },
    FieldAccessLevel,
    FieldPermissionResource,
    __mockInstance: mockInstance,
  };
});

vi.mock('../../models/AuditLog', () => ({
  default: { create: vi.fn().mockResolvedValue({}) },
}));

// sequelize.transaction wraps a callback — stub it to call through immediately.
vi.mock('../../sequelize', () => ({
  default: {
    transaction: vi.fn().mockImplementation(async (cb: (t: unknown) => Promise<unknown>) => cb({})),
  },
}));

// Spy on the cache-invalidation helper.
vi.mock('../../middleware/field-permissions', () => ({
  clearFieldPermissionCache: vi.fn(),
}));

import FieldPermission, {
  FieldAccessLevel,
  FieldPermissionResource,
} from '../../models/FieldPermission';
import { FieldPermissionService } from '../../services/field-permission.service';
import { clearFieldPermissionCache } from '../../middleware/field-permissions';

const fpFindAll = FieldPermission.findAll as ReturnType<typeof vi.fn>;
const fpFindOne = FieldPermission.findOne as ReturnType<typeof vi.fn>;
const fpCreate = FieldPermission.create as ReturnType<typeof vi.fn>;
const fpDestroy = FieldPermission.destroy as ReturnType<typeof vi.fn>;

const clearCacheSpy = clearFieldPermissionCache as ReturnType<typeof vi.fn>;

const makeRecord = (overrides: Record<string, unknown> = {}) => ({
  field_permission_id: 1,
  resource: FieldPermissionResource.USERS,
  field_name: 'email',
  role: 'adopter',
  access_level: FieldAccessLevel.READ,
  update: vi.fn().mockResolvedValue({ field_permission_id: 1, ...overrides }),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FieldPermissionService.getByResource', () => {
  it('returns all permissions for a resource', async () => {
    const records = [makeRecord(), makeRecord({ field_name: 'status' })];
    fpFindAll.mockResolvedValueOnce(records);

    const result = await FieldPermissionService.getByResource(FieldPermissionResource.USERS);

    expect(result).toHaveLength(2);
    expect(fpFindAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { resource: FieldPermissionResource.USERS },
      })
    );
  });

  it('returns an empty array when no permissions are configured', async () => {
    fpFindAll.mockResolvedValueOnce([]);
    const result = await FieldPermissionService.getByResource(FieldPermissionResource.PETS);
    expect(result).toEqual([]);
  });
});

describe('FieldPermissionService.getByResourceAndRole', () => {
  it('filters by both resource and role', async () => {
    const records = [makeRecord()];
    fpFindAll.mockResolvedValueOnce(records);

    await FieldPermissionService.getByResourceAndRole(FieldPermissionResource.USERS, 'admin');

    expect(fpFindAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { resource: FieldPermissionResource.USERS, role: 'admin' },
      })
    );
  });
});

describe('FieldPermissionService.upsert — create path', () => {
  it('creates a new record when none exists', async () => {
    fpFindOne.mockResolvedValueOnce(null);
    const newRecord = makeRecord();
    fpCreate.mockResolvedValueOnce(newRecord);

    const result = await FieldPermissionService.upsert(
      FieldPermissionResource.USERS,
      'email',
      'adopter',
      FieldAccessLevel.READ,
      'admin-1'
    );

    expect(fpCreate).toHaveBeenCalled();
    expect(result).toBe(newRecord);
  });

  it('clears the permission cache for the affected resource and role', async () => {
    fpFindOne.mockResolvedValueOnce(null);
    fpCreate.mockResolvedValueOnce(makeRecord());

    await FieldPermissionService.upsert(
      FieldPermissionResource.USERS,
      'email',
      'adopter',
      FieldAccessLevel.READ,
      'admin-1'
    );

    expect(clearCacheSpy).toHaveBeenCalledWith(FieldPermissionResource.USERS, 'adopter');
  });
});

describe('FieldPermissionService.upsert — update path', () => {
  it('updates the access_level on an existing record', async () => {
    const existing = makeRecord({ access_level: FieldAccessLevel.READ });
    fpFindOne.mockResolvedValueOnce(existing);

    await FieldPermissionService.upsert(
      FieldPermissionResource.USERS,
      'email',
      'adopter',
      FieldAccessLevel.WRITE,
      'admin-1'
    );

    expect(existing.update).toHaveBeenCalledWith(
      { access_level: FieldAccessLevel.WRITE },
      expect.anything()
    );
    expect(fpCreate).not.toHaveBeenCalled();
  });
});

describe('FieldPermissionService.deleteOverride', () => {
  it('returns true and clears cache when a record is deleted', async () => {
    fpDestroy.mockResolvedValueOnce(1);

    const result = await FieldPermissionService.deleteOverride(
      FieldPermissionResource.USERS,
      'adopter',
      'email',
      'admin-1'
    );

    expect(result).toBe(true);
    expect(clearCacheSpy).toHaveBeenCalledWith(FieldPermissionResource.USERS, 'adopter');
  });

  it('returns false when no matching record exists', async () => {
    fpDestroy.mockResolvedValueOnce(0);

    const result = await FieldPermissionService.deleteOverride(
      FieldPermissionResource.USERS,
      'adopter',
      'nonexistent_field',
      'admin-1'
    );

    expect(result).toBe(false);
    expect(clearCacheSpy).not.toHaveBeenCalled();
  });
});

describe('FieldPermissionService.deleteAllForRole', () => {
  it('returns the count of deleted records', async () => {
    fpDestroy.mockResolvedValueOnce(3);

    const deleted = await FieldPermissionService.deleteAllForRole(
      FieldPermissionResource.PETS,
      'moderator',
      'admin-1'
    );

    expect(deleted).toBe(3);
    expect(clearCacheSpy).toHaveBeenCalledWith(FieldPermissionResource.PETS, 'moderator');
  });

  it('returns zero and does not clear cache when nothing was deleted', async () => {
    fpDestroy.mockResolvedValueOnce(0);

    const deleted = await FieldPermissionService.deleteAllForRole(
      FieldPermissionResource.PETS,
      'nobody',
      'admin-1'
    );

    expect(deleted).toBe(0);
    expect(clearCacheSpy).not.toHaveBeenCalled();
  });
});

describe('FieldPermissionService.bulkUpsert', () => {
  it('upserts each override and returns all records', async () => {
    const r1 = makeRecord({ field_name: 'email' });
    const r2 = makeRecord({ field_name: 'status' });

    // Two findOne → null, two create → records
    fpFindOne.mockResolvedValue(null);
    fpCreate.mockResolvedValueOnce(r1).mockResolvedValueOnce(r2);

    const results = await FieldPermissionService.bulkUpsert(
      [
        {
          resource: FieldPermissionResource.USERS,
          field_name: 'email',
          role: 'adopter',
          access_level: FieldAccessLevel.READ,
        },
        {
          resource: FieldPermissionResource.USERS,
          field_name: 'status',
          role: 'adopter',
          access_level: FieldAccessLevel.NONE,
        },
      ],
      'admin-1'
    );

    expect(results).toHaveLength(2);
  });
});
