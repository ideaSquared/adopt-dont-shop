/**
 * Lib services fall back to a private ApiService when no client is passed, which
 * bypasses the configured shared apiService (base URL, onUnauthorized, session
 * handling). These tests pin that the shared client is handed to each of them.
 */

import { describe, it, expect, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  permissions: [] as unknown[],
  discovery: [] as unknown[],
}));

vi.mock('@adopt-dont-shop/lib.permissions', () => ({
  PermissionsService: class {
    constructor(...args: unknown[]) {
      captured.permissions = args;
    }
  },
}));

vi.mock('@adopt-dont-shop/lib.discovery', () => ({
  DiscoveryService: class {
    constructor(...args: unknown[]) {
      captured.discovery = args;
    }
  },
}));

import { apiService } from './libraryServices';

describe('client libraryServices', () => {
  it('passes the shared apiService to the permissions service', () => {
    expect(captured.permissions[1]).toBe(apiService);
  });

  it('passes the shared apiService to the discovery service', () => {
    expect(captured.discovery[1]).toBe(apiService);
  });
});
