import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextFunction, Response } from 'express';
import {
  clearFieldPermissionCache,
  fieldMask,
  fieldWriteGuard,
  maskResponseFields,
} from '../../middleware/field-permissions';
import FieldPermission from '../../models/FieldPermission';
import { UserType } from '../../models/User';
import { AuthenticatedRequest } from '../../types/auth';

vi.mock('../../models/FieldPermission', () => ({
  default: {
    findAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../models/AuditLog', () => ({
  default: {
    create: vi.fn().mockResolvedValue({}),
  },
}));
describe('Field Permissions Middleware - maskResponseFields', () => {
  const adminAccessMap: Record<string, string> = {
    userId: 'read',
    firstName: 'write',
    lastName: 'write',
    email: 'write',
    status: 'write',
    password: 'none',
    resetToken: 'none',
    twoFactorSecret: 'none',
  };

  const adopterAccessMap: Record<string, string> = {
    userId: 'read',
    firstName: 'read',
    lastName: 'read',
    email: 'none',
    status: 'none',
    password: 'none',
    resetToken: 'none',
    twoFactorSecret: 'none',
  };

  describe('read masking', () => {
    it('should include readable and writable fields for admin', () => {
      const data = {
        userId: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        status: 'active',
        password: 'hashed123',
        resetToken: 'tok-123',
        twoFactorSecret: 'secret',
      };

      const masked = maskResponseFields(data, adminAccessMap, 'read');

      expect(masked).toEqual({
        userId: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        status: 'active',
      });
      expect(masked).not.toHaveProperty('password');
      expect(masked).not.toHaveProperty('resetToken');
      expect(masked).not.toHaveProperty('twoFactorSecret');
    });

    it('should restrict fields for adopter role', () => {
      const data = {
        userId: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        status: 'active',
        password: 'hashed123',
      };

      const masked = maskResponseFields(data, adopterAccessMap, 'read');

      expect(masked).toEqual({
        userId: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
      });
      expect(masked).not.toHaveProperty('email');
      expect(masked).not.toHaveProperty('status');
      expect(masked).not.toHaveProperty('password');
    });

    it('should exclude fields not in the access map (secure by default)', () => {
      const data = {
        userId: 'user-1',
        firstName: 'Jane',
        unknownField: 'should be removed',
      };

      const masked = maskResponseFields(data, adminAccessMap, 'read');

      expect(masked).toHaveProperty('userId');
      expect(masked).toHaveProperty('firstName');
      expect(masked).not.toHaveProperty('unknownField');
    });
  });

  describe('write masking', () => {
    it('should only include writable fields for admin', () => {
      const data = {
        userId: 'attempt-change',
        firstName: 'Updated',
        email: 'new@email.com',
        password: 'newpass',
      };

      const masked = maskResponseFields(data, adminAccessMap, 'write');

      expect(masked).toEqual({
        firstName: 'Updated',
        email: 'new@email.com',
      });
      expect(masked).not.toHaveProperty('userId');
      expect(masked).not.toHaveProperty('password');
    });

    it('should return empty object for adopter write attempt on user fields', () => {
      const data = {
        firstName: 'Changed',
        email: 'new@email.com',
      };

      const masked = maskResponseFields(data, adopterAccessMap, 'write');

      expect(Object.keys(masked)).toHaveLength(0);
    });
  });

  describe('application field masking scenarios', () => {
    const staffAccessMap: Record<string, string> = {
      applicationId: 'read',
      userId: 'read',
      status: 'write',
      answers: 'read',
      interviewNotes: 'write',
      homeVisitNotes: 'write',
      score: 'write',
    };

    const applicantAccessMap: Record<string, string> = {
      applicationId: 'read',
      userId: 'read',
      status: 'read',
      answers: 'read',
      interviewNotes: 'none',
      homeVisitNotes: 'none',
      score: 'none',
    };

    it('should show all application fields to rescue staff including internal notes', () => {
      const application = {
        applicationId: 'app-1',
        userId: 'user-1',
        status: 'reviewing',
        answers: { q1: 'yes' },
        interviewNotes: 'Seems like a great fit',
        homeVisitNotes: 'Clean home, large yard',
        score: 92,
      };

      const masked = maskResponseFields(application, staffAccessMap, 'read');

      expect(masked).toHaveProperty('interviewNotes');
      expect(masked).toHaveProperty('homeVisitNotes');
      expect(masked).toHaveProperty('score');
      expect(masked).toHaveProperty('applicationId');
      expect(masked).toHaveProperty('status');
    });

    it('should hide internal application notes from applicants', () => {
      const application = {
        applicationId: 'app-1',
        userId: 'user-1',
        status: 'reviewing',
        answers: { q1: 'yes' },
        interviewNotes: 'Seems like a great fit',
        homeVisitNotes: 'Clean home, large yard',
        score: 92,
      };

      const masked = maskResponseFields(application, applicantAccessMap, 'read');

      expect(masked).toHaveProperty('applicationId');
      expect(masked).toHaveProperty('status');
      expect(masked).toHaveProperty('answers');
      expect(masked).not.toHaveProperty('interviewNotes');
      expect(masked).not.toHaveProperty('homeVisitNotes');
      expect(masked).not.toHaveProperty('score');
    });

    it('should allow staff to write internal notes but not change applicationId', () => {
      const updateData = {
        applicationId: 'attempt-change',
        interviewNotes: 'Updated notes',
        score: 95,
      };

      const masked = maskResponseFields(updateData, staffAccessMap, 'write');

      expect(masked).not.toHaveProperty('applicationId');
      expect(masked).toHaveProperty('interviewNotes', 'Updated notes');
      expect(masked).toHaveProperty('score', 95);
    });
  });

  describe('pet field masking scenarios', () => {
    const publicPetMap: Record<string, string> = {
      petId: 'read',
      name: 'read',
      type: 'read',
      breed: 'read',
      description: 'read',
      medicalHistory: 'none',
      internalNotes: 'none',
    };

    it('should show basic pet info but hide medical details from public', () => {
      const pet = {
        petId: 'pet-1',
        name: 'Buddy',
        type: 'dog',
        breed: 'Labrador',
        description: 'Friendly and energetic',
        medicalHistory: 'Heart condition - requires medication',
        internalNotes: 'Previous owner reported aggression',
      };

      const masked = maskResponseFields(pet, publicPetMap, 'read');

      expect(masked).toHaveProperty('name', 'Buddy');
      expect(masked).toHaveProperty('description');
      expect(masked).not.toHaveProperty('medicalHistory');
      expect(masked).not.toHaveProperty('internalNotes');
    });
  });

  describe('edge cases', () => {
    it('should handle empty data objects', () => {
      const masked = maskResponseFields({}, adminAccessMap, 'read');
      expect(masked).toEqual({});
    });

    it('should handle data with only hidden fields', () => {
      const data = { password: 'secret', resetToken: 'tok' };
      const masked = maskResponseFields(data, adminAccessMap, 'read');
      expect(masked).toEqual({});
    });

    it('should handle empty access map', () => {
      const data = { userId: '1', firstName: 'Jane' };
      const masked = maskResponseFields(data, {}, 'read');
      expect(masked).toEqual({});
    });

    it('should preserve null and undefined values in accessible fields', () => {
      const data: Record<string, unknown> = {
        userId: 'user-1',
        firstName: null,
        lastName: undefined,
      };

      const masked = maskResponseFields(data, adminAccessMap, 'read');

      expect(masked).toHaveProperty('userId');
      expect(masked).toHaveProperty('firstName', null);
      expect(masked).toHaveProperty('lastName', undefined);
    });

    it('should preserve nested objects in accessible fields', () => {
      const accessMap = { settings: 'read' };
      const data = {
        settings: { theme: 'dark', notifications: true },
      };

      const masked = maskResponseFields(data, accessMap, 'read');

      expect(masked).toEqual({
        settings: { theme: 'dark', notifications: true },
      });
    });

    it('should handle arrays in field values correctly', () => {
      const accessMap = { tags: 'read', secret: 'none' };
      const data = {
        tags: ['friendly', 'trained'],
        secret: ['hidden'],
      };

      const masked = maskResponseFields(data, accessMap, 'read');

      expect(masked).toHaveProperty('tags');
      expect(masked).not.toHaveProperty('secret');
    });
  });
});

describe('Field Permissions Middleware - fieldMask (Express integration)', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let capturedJson: unknown;

  beforeEach(() => {
    clearFieldPermissionCache();
    vi.clearAllMocks();
    (FieldPermission.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    mockRequest = {
      params: {},
      ip: '127.0.0.1',
      get: vi.fn().mockReturnValue('test-agent') as unknown as AuthenticatedRequest['get'],
    };

    capturedJson = undefined;
    mockResponse = {
      json: vi.fn().mockImplementation((body: unknown) => {
        capturedJson = body;
        return mockResponse as Response;
      }) as unknown as Response['json'],
    };
    mockNext = vi.fn();
  });

  it('should skip masking when user is not authenticated', async () => {
    const middleware = fieldMask('users');
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(FieldPermission.findAll).not.toHaveBeenCalled();
  });

  it('should mask sensitive fields for an adopter reading a user object', async () => {
    mockRequest.user = {
      userId: 'user-1',
      userType: UserType.ADOPTER,
    } as AuthenticatedRequest['user'];

    const middleware = fieldMask('users');
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    // Controller calls res.json with a user object
    (mockResponse.json as (body: unknown) => Response)({
      data: {
        userId: 'user-1',
        firstName: 'Jane',
        email: 'jane@example.com',
        password: 'hashed-secret',
        resetToken: 'tok-abc',
      },
    });

    const body = capturedJson as { data: Record<string, unknown> };
    expect(body.data).not.toHaveProperty('password');
    expect(body.data).not.toHaveProperty('resetToken');
  });

  it('should expose admin-only fields when an admin reads a user object', async () => {
    mockRequest.user = {
      userId: 'admin-1',
      userType: UserType.ADMIN,
    } as AuthenticatedRequest['user'];

    const middleware = fieldMask('users');
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    (mockResponse.json as (body: unknown) => Response)({
      data: {
        userId: 'user-1',
        firstName: 'Jane',
        email: 'jane@example.com',
        status: 'active',
      },
    });

    const body = capturedJson as { data: Record<string, unknown> };
    expect(body.data).toHaveProperty('email');
    expect(body.data).toHaveProperty('status');
  });

  it('should mask every item in an array response', async () => {
    mockRequest.user = {
      userId: 'user-1',
      userType: UserType.ADOPTER,
    } as AuthenticatedRequest['user'];

    const middleware = fieldMask('users');
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    (mockResponse.json as (body: unknown) => Response)({
      data: [
        { userId: 'u1', firstName: 'A', password: 'h1' },
        { userId: 'u2', firstName: 'B', password: 'h2' },
      ],
    });

    const body = capturedJson as { data: Array<Record<string, unknown>> };
    expect(body.data).toHaveLength(2);
    body.data.forEach(item => {
      expect(item).not.toHaveProperty('password');
    });
  });

  it('should apply DB-level overrides on top of role defaults', async () => {
    mockRequest.user = {
      userId: 'adopter-1',
      userType: UserType.ADOPTER,
    } as AuthenticatedRequest['user'];

    // Override: explicitly grant adopter read access to email on users
    (FieldPermission.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      { fieldName: 'email', accessLevel: 'read' },
    ]);

    const middleware = fieldMask('users');
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    (mockResponse.json as (body: unknown) => Response)({
      data: {
        userId: 'user-1',
        email: 'override@example.com',
        password: 'hashed',
      },
    });

    const body = capturedJson as { data: Record<string, unknown> };
    expect(body.data).toHaveProperty('email', 'override@example.com');
    expect(body.data).not.toHaveProperty('password');
  });

  it('should leave error responses unmodified', async () => {
    mockRequest.user = {
      userId: 'user-1',
      userType: UserType.ADOPTER,
    } as AuthenticatedRequest['user'];

    const middleware = fieldMask('users');
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    const errorBody = { error: 'Not found' };
    (mockResponse.json as (body: unknown) => Response)(errorBody);

    expect(capturedJson).toEqual(errorBody);
  });

  it('should cache override lookups across subsequent requests', async () => {
    mockRequest.user = {
      userId: 'u',
      userType: UserType.ADOPTER,
    } as AuthenticatedRequest['user'];

    const middleware = fieldMask('users');
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    // Should hit DB only once due to 1-minute cache
    expect(FieldPermission.findAll).toHaveBeenCalledTimes(1);
  });
});

describe('Field Permissions Middleware - fieldWriteGuard (Express integration)', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusCode: number | undefined;
  let jsonBody: unknown;

  beforeEach(() => {
    clearFieldPermissionCache();
    vi.clearAllMocks();
    (FieldPermission.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    statusCode = undefined;
    jsonBody = undefined;

    mockRequest = {
      params: {},
      path: '/api/test',
      ip: '127.0.0.1',
      body: {},
      get: vi.fn().mockReturnValue('test-agent') as unknown as AuthenticatedRequest['get'],
    };

    mockResponse = {
      status: vi.fn().mockImplementation((code: number) => {
        statusCode = code;
        return mockResponse as Response;
      }) as unknown as Response['status'],
      json: vi.fn().mockImplementation((body: unknown) => {
        jsonBody = body;
        return mockResponse as Response;
      }) as unknown as Response['json'],
    };
    mockNext = vi.fn();
  });

  it('should reject request with 401 when user is not authenticated', async () => {
    const middleware = fieldWriteGuard('users');
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(statusCode).toBe(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should allow writes when all fields have write access', async () => {
    mockRequest.user = {
      userId: 'admin-1',
      userType: UserType.ADMIN,
    } as AuthenticatedRequest['user'];
    mockRequest.body = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    const middleware = fieldWriteGuard('users');
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(statusCode).toBeUndefined();
  });

  it('should reject write with 403 when body contains read-only field', async () => {
    mockRequest.user = {
      userId: 'adopter-1',
      userType: UserType.ADOPTER,
    } as AuthenticatedRequest['user'];
    // Adopters can READ firstName but cannot WRITE it by default
    mockRequest.body = {
      firstName: 'Jane',
    };

    const middleware = fieldWriteGuard('users');
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(statusCode).toBe(403);
    const body = jsonBody as { error: string; blockedFields: string[] };
    expect(body.blockedFields).toContain('firstName');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject write with 403 when body contains a hidden field', async () => {
    mockRequest.user = {
      userId: 'admin-1',
      userType: UserType.ADMIN,
    } as AuthenticatedRequest['user'];
    // password should never be directly writable via normal update endpoint
    mockRequest.body = {
      firstName: 'Updated',
      password: 'newPassword123',
    };

    const middleware = fieldWriteGuard('users');
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(statusCode).toBe(403);
    const body = jsonBody as { blockedFields: string[] };
    expect(body.blockedFields).toContain('password');
  });

  it('should pass through when body is empty or not an object', async () => {
    mockRequest.user = {
      userId: 'adopter-1',
      userType: UserType.ADOPTER,
    } as AuthenticatedRequest['user'];
    mockRequest.body = undefined;

    const middleware = fieldWriteGuard('users');
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(statusCode).toBeUndefined();
  });

  it('should honor DB overrides that grant write access', async () => {
    mockRequest.user = {
      userId: 'adopter-1',
      userType: UserType.ADOPTER,
    } as AuthenticatedRequest['user'];
    mockRequest.body = {
      email: 'new@example.com',
    };

    // Override: grant adopters write access to email (default is 'none')
    (FieldPermission.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      { fieldName: 'email', accessLevel: 'write' },
    ]);

    const middleware = fieldWriteGuard('users');
    await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(statusCode).toBeUndefined();
  });
});
