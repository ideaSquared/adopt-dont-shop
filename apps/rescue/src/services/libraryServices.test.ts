/**
 * NotificationsService falls back to a private ApiService when no client is
 * passed, bypassing the configured shared apiService. Pin that rescue hands it
 * the shared client.
 */

import { describe, it, expect, vi } from 'vitest';

const captured = vi.hoisted(() => ({ notifications: [] as unknown[] }));

vi.mock('@adopt-dont-shop/lib.notifications', () => ({
  NotificationsService: class {
    constructor(...args: unknown[]) {
      captured.notifications = args;
    }
  },
}));

import { apiService } from './libraryServices';

describe('rescue libraryServices', () => {
  it('passes the shared apiService to the notifications service', () => {
    expect(captured.notifications[1]).toBe(apiService);
  });
});
