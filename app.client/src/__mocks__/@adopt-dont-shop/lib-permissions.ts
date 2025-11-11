/**
 * Mock for @adopt-dont-shop/lib-permissions
 */

export class PermissionsService {
  hasPermission = jest.fn(() => Promise.resolve(false));
  getUserPermissions = jest.fn(() => Promise.resolve([]));
  checkPermission = jest.fn(() => Promise.resolve(false));
}

export const permissionsService = new PermissionsService();
