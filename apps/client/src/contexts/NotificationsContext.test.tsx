/**
 * The provider must build its NotificationsService on the shared apiService so
 * requests carry the configured base URL, CSRF state and 401 handling rather
 * than a private client.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const constructorArgs = vi.hoisted(() => ({ calls: [] as unknown[][] }));
const sharedApiService = vi.hoisted(() => ({ name: 'shared-api-service' }));

vi.mock('@/services/libraryServices', () => ({ apiService: sharedApiService }));

vi.mock('@adopt-dont-shop/lib.notifications', () => ({
  NotificationsService: class {
    constructor(...args: unknown[]) {
      constructorArgs.calls.push(args);
    }
    getUserNotifications = vi.fn().mockResolvedValue({ data: [] });
  },
}));

import { NotificationsProvider, useNotifications } from './NotificationsContext';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <NotificationsProvider>{children}</NotificationsProvider>
  </QueryClientProvider>
);

describe('NotificationsContext', () => {
  it('builds the notifications service on the shared apiService', () => {
    renderHook(() => useNotifications(), { wrapper });

    expect(constructorArgs.calls[0]?.[1]).toBe(sharedApiService);
  });
});
