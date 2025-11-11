import { vi } from 'vitest';
import { Response, NextFunction } from 'express';
import { UserType } from '../../models/User';
import {
  requireRole,
  requirePermission,
  requireOwnership,
  requirePermissionOrOwnership,
  requireAdmin,
  requireRescue,
  requireAdminOrRescue,
  requireOwnershipOrAdmin,
} from '../../middleware/rbac';
import { AuthenticatedRequest } from '../../types/auth';
import { logger } from '../../utils/logger';

describe('RBAC Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      path: '/api/test',
      params: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('requireRole - Role-based access control', () => {
    describe('when user is not authenticated', () => {
      it('should reject request with 401', () => {
        mockRequest.user = undefined;

        const middleware = requireRole(UserType.ADMIN);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication required',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when user lacks required role', () => {
      it('should reject request with 403', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
        } as AuthenticatedRequest['user'];

        const middleware = requireRole(UserType.ADMIN);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access denied',
          message: 'Insufficient permissions',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should log access denial', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
        } as AuthenticatedRequest['user'];

        const middleware = requireRole(UserType.ADMIN);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(logger.warn).toHaveBeenCalledWith(
          'Access denied - insufficient permissions',
          {
            userId: 'user-123',
            userType: UserType.ADOPTER,
            requiredRoles: [UserType.ADMIN],
          }
        );
      });
    });

    describe('when user has required role', () => {
      it('should allow access for matching role', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADMIN,
        } as AuthenticatedRequest['user'];

        const middleware = requireRole(UserType.ADMIN);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should allow access when user has one of multiple allowed roles', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.RESCUE_STAFF,
        } as AuthenticatedRequest['user'];

        const middleware = requireRole(UserType.ADMIN, UserType.RESCUE_STAFF);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should allow adopter role when specified', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
        } as AuthenticatedRequest['user'];

        const middleware = requireRole(UserType.ADOPTER);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should allow moderator role when specified', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.MODERATOR,
        } as AuthenticatedRequest['user'];

        const middleware = requireRole(UserType.MODERATOR, UserType.ADMIN);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when user has no userType', () => {
      it('should reject request', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: undefined,
        } as unknown as AuthenticatedRequest['user'];

        const middleware = requireRole(UserType.ADMIN);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when error occurs', () => {
      it('should return 500 and log error', () => {
        mockRequest.user = {
          userId: 'user-123',
          get userType(): UserType {
            throw new Error('Database error');
          },
        } as AuthenticatedRequest['user'];

        const middleware = requireRole(UserType.ADMIN);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authorization error',
        });
        expect(logger.error).toHaveBeenCalledWith('RBAC middleware error:', expect.any(Error));
      });
    });
  });

  describe('requirePermission - Permission-based access control', () => {
    describe('when user is not authenticated', () => {
      it('should reject request with 401', () => {
        mockRequest.user = undefined;

        const middleware = requirePermission('pets:create');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication required',
          message: 'User must be authenticated',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('when user lacks required permission', () => {
      it('should reject request with 403', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
          Roles: [
            {
              name: 'user',
              Permissions: [],
            },
          ],
        } as unknown as AuthenticatedRequest['user'];

        const middleware = requirePermission('pets:delete');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access denied',
          message: 'Insufficient permissions',
        });
      });

      it('should log permission denial with details', () => {
        const requestWithPath = {
          ...mockRequest,
          path: '/api/pets/123',
        };
        requestWithPath.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
          Roles: [],
        } as unknown as AuthenticatedRequest['user'];

        const middleware = requirePermission('pets:delete');
        middleware(requestWithPath as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(logger.warn).toHaveBeenCalledWith(
          'Access denied - missing permission: pets:delete',
          {
            userId: 'user-123',
            userType: UserType.ADOPTER,
            requiredPermission: 'pets:delete',
            endpoint: '/api/pets/123',
          }
        );
      });
    });

    describe('when user has required permission', () => {
      it('should allow access', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADMIN,
          Roles: [
            {
              name: 'admin',
              Permissions: [
                { permissionName: 'pets:delete' },
              ],
            },
          ],
        } as unknown as AuthenticatedRequest['user'];

        const middleware = requirePermission('pets:delete');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should allow access if any role has the permission', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.RESCUE_STAFF,
          Roles: [
            {
              name: 'basic',
              Permissions: [],
            },
            {
              name: 'advanced',
              Permissions: [
                { permissionName: 'pets:create' },
              ],
            },
          ],
        } as unknown as AuthenticatedRequest['user'];

        const middleware = requirePermission('pets:create');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when user has no roles', () => {
      it('should reject request', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
          Roles: undefined,
        } as AuthenticatedRequest['user'];

        const middleware = requirePermission('pets:create');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('requireOwnership - Resource ownership check', () => {
    describe('when user is not authenticated', () => {
      it('should reject request with 401', () => {
        mockRequest.user = undefined;

        const middleware = requireOwnership('userId');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication required',
          message: 'User must be authenticated',
        });
      });
    });

    describe('when checking userId ownership', () => {
      it('should reject if user does not own the resource', () => {
        const requestWithPath = {
          ...mockRequest,
          path: '/api/users/user-456/profile',
          params: { userId: 'user-456' },
        };
        requestWithPath.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
        } as AuthenticatedRequest['user'];

        const middleware = requireOwnership('userId');
        middleware(requestWithPath as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access denied',
          message: 'You can only access your own resources',
        });
      });

      it('should log ownership check failure', () => {
        const requestWithPath = {
          ...mockRequest,
          path: '/api/users/user-456/profile',
          params: { userId: 'user-456' },
        };
        requestWithPath.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
        } as unknown as AuthenticatedRequest['user'];

        const middleware = requireOwnership('userId');
        middleware(requestWithPath as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(logger.warn).toHaveBeenCalledWith(
          'Access denied - resource ownership check failed',
          {
            userId: 'user-123',
            resourceId: 'user-456',
            resourceParam: 'userId',
            endpoint: '/api/users/user-456/profile',
          }
        );
      });

      it('should allow access if user owns the resource', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
        } as AuthenticatedRequest['user'];
        mockRequest.params = { userId: 'user-123' };

        const middleware = requireOwnership('userId');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });
    });

    describe('when checking non-userId resources', () => {
      it('should pass through for other resource types', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
        } as AuthenticatedRequest['user'];
        mockRequest.params = { id: 'resource-456' };

        const middleware = requireOwnership('id');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should attach resourceId to request', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
        } as AuthenticatedRequest['user'];
        mockRequest.params = { petId: 'pet-789' };

        const middleware = requireOwnership('petId');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect((mockRequest as AuthenticatedRequest & { resourceId: string }).resourceId).toBe('pet-789');
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when using default parameter', () => {
      it('should default to "id" parameter', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
        } as AuthenticatedRequest['user'];
        mockRequest.params = { id: 'resource-123' };

        const middleware = requireOwnership();
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('requirePermissionOrOwnership - Combined check', () => {
    describe('when user is not authenticated', () => {
      it('should reject request with 401', () => {
        mockRequest.user = undefined;

        const middleware = requirePermissionOrOwnership('pets:update', 'petId');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication required',
          message: 'User must be authenticated',
        });
      });
    });

    describe('when user has permission', () => {
      it('should allow access without checking ownership', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADMIN,
          Roles: [
            {
              name: 'admin',
              Permissions: [{ name: 'pets:update' }],
            },
          ],
        } as unknown as AuthenticatedRequest['user'];
        mockRequest.params = { petId: 'pet-456' };

        const middleware = requirePermissionOrOwnership('pets:update', 'petId');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when user lacks permission but owns resource', () => {
      it('should allow access for userId ownership', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
          Roles: [],
        } as unknown as AuthenticatedRequest['user'];
        mockRequest.params = { userId: 'user-123' };

        const middleware = requirePermissionOrOwnership('users:update', 'userId');
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when user lacks permission and does not own resource', () => {
      it('should reject request', () => {
        const requestWithPath = {
          ...mockRequest,
          path: '/api/users/user-456',
          params: { userId: 'user-456' },
        };
        requestWithPath.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
          Roles: [],
        } as unknown as AuthenticatedRequest['user'];

        const middleware = requirePermissionOrOwnership('users:update', 'userId');
        middleware(requestWithPath as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access denied',
          message: 'Insufficient permissions',
        });
      });

      it('should log denial with details', () => {
        const requestWithPath = {
          ...mockRequest,
          path: '/api/users/user-456',
          params: { userId: 'user-456' },
        };
        requestWithPath.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
          Roles: [],
        } as unknown as AuthenticatedRequest['user'];

        const middleware = requirePermissionOrOwnership('users:update', 'userId');
        middleware(requestWithPath as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(logger.warn).toHaveBeenCalledWith(
          'Access denied - neither permission nor ownership',
          {
            userId: 'user-123',
            permission: 'users:update',
            resourceId: 'user-456',
            endpoint: '/api/users/user-456',
          }
        );
      });
    });
  });

  describe('requireAdmin - Admin-only shortcut', () => {
    it('should require ADMIN role', () => {
      mockRequest.user = {
        userId: 'user-123',
        userType: UserType.ADOPTER,
      } as AuthenticatedRequest['user'];

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow admin access', () => {
      mockRequest.user = {
        userId: 'admin-123',
        userType: UserType.ADMIN,
      } as AuthenticatedRequest['user'];

      requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRescue - Rescue staff shortcut', () => {
    it('should allow RESCUE_STAFF', () => {
      mockRequest.user = {
        userId: 'staff-123',
        userType: UserType.RESCUE_STAFF,
      } as AuthenticatedRequest['user'];

      requireRescue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow ADMIN', () => {
      mockRequest.user = {
        userId: 'admin-123',
        userType: UserType.ADMIN,
      } as AuthenticatedRequest['user'];

      requireRescue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject ADOPTER', () => {
      mockRequest.user = {
        userId: 'user-123',
        userType: UserType.ADOPTER,
      } as AuthenticatedRequest['user'];

      requireRescue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireAdminOrRescue - Admin or Rescue staff', () => {
    it('should allow ADMIN', () => {
      mockRequest.user = {
        userId: 'admin-123',
        userType: UserType.ADMIN,
      } as AuthenticatedRequest['user'];

      requireAdminOrRescue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow RESCUE_STAFF', () => {
      mockRequest.user = {
        userId: 'staff-123',
        userType: UserType.RESCUE_STAFF,
      } as AuthenticatedRequest['user'];

      requireAdminOrRescue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject ADOPTER', () => {
      mockRequest.user = {
        userId: 'user-123',
        userType: UserType.ADOPTER,
      } as AuthenticatedRequest['user'];

      requireAdminOrRescue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireOwnershipOrAdmin - Dynamic ownership check', () => {
    const getResourceUserId = (req: AuthenticatedRequest) => req.params.ownerId;

    describe('when user is not authenticated', () => {
      it('should reject request', () => {
        mockRequest.user = undefined;

        const middleware = requireOwnershipOrAdmin(getResourceUserId);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication required',
        });
      });
    });

    describe('when user is admin', () => {
      it('should allow access regardless of ownership', () => {
        mockRequest.user = {
          userId: 'admin-123',
          userType: UserType.ADMIN,
        } as AuthenticatedRequest['user'];
        mockRequest.params = { ownerId: 'user-456' };

        const middleware = requireOwnershipOrAdmin(getResourceUserId);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when user owns the resource', () => {
      it('should allow access', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
        } as AuthenticatedRequest['user'];
        mockRequest.params = { ownerId: 'user-123' };

        const middleware = requireOwnershipOrAdmin(getResourceUserId);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('when user is not admin and does not own resource', () => {
      it('should reject request', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
        } as AuthenticatedRequest['user'];
        mockRequest.params = { ownerId: 'user-456' };

        const middleware = requireOwnershipOrAdmin(getResourceUserId);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access denied',
          message: 'You can only access your own resources',
        });
      });

      it('should log access denial', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
        } as AuthenticatedRequest['user'];
        mockRequest.params = { ownerId: 'user-456' };

        const middleware = requireOwnershipOrAdmin(getResourceUserId);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(logger.warn).toHaveBeenCalledWith(
          'Access denied - not owner or admin',
          {
            userId: 'user-123',
            resourceUserId: 'user-456',
            userType: UserType.ADOPTER,
          }
        );
      });
    });

    describe('when resource has no owner', () => {
      it('should reject request', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
        } as AuthenticatedRequest['user'];
        mockRequest.params = {};

        const getNoOwner = () => undefined;
        const middleware = requireOwnershipOrAdmin(getNoOwner);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
      });
    });

    describe('when error occurs in ownership function', () => {
      it('should return 500 and log error', () => {
        mockRequest.user = {
          userId: 'user-123',
          userType: UserType.ADOPTER,
        } as AuthenticatedRequest['user'];

        const getOwnerWithError = () => {
          throw new Error('Database error');
        };
        const middleware = requireOwnershipOrAdmin(getOwnerWithError);
        middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authorization error',
        });
        expect(logger.error).toHaveBeenCalledWith('Ownership middleware error:', expect.any(Error));
      });
    });
  });
});
