import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/notification-preferences-service', () => ({
  fetchNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
}));

import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../services/notification-preferences-service';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from './use-notification-preferences';

const PREFS: NotificationPreferences = {
  emailEnabled: true,
  pushEnabled: true,
  smsEnabled: false,
  applicationUpdates: true,
  petMatches: true,
  rescueUpdates: true,
  chatMessages: true,
  digestFrequency: 'weekly',
  quietHoursStart: '',
  quietHoursEnd: '',
  timezone: 'Europe/London',
};

const makeWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useNotificationPreferences', () => {
  it('loads the signed-in user’s preferences', async () => {
    vi.mocked(fetchNotificationPreferences).mockResolvedValue(PREFS);

    const { result } = renderHook(() => useNotificationPreferences(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(PREFS);
  });
});

describe('useUpdateNotificationPreferences', () => {
  it('saves and then serves the saved preferences to readers', async () => {
    const saved = { ...PREFS, digestFrequency: 'daily' as const };
    vi.mocked(fetchNotificationPreferences).mockResolvedValueOnce(PREFS);
    vi.mocked(updateNotificationPreferences).mockResolvedValue(saved);

    const { result } = renderHook(
      () => ({ read: useNotificationPreferences(), write: useUpdateNotificationPreferences() }),
      { wrapper: makeWrapper() }
    );
    await waitFor(() => expect(result.current.read.isSuccess).toBe(true));

    await act(() => result.current.write.mutateAsync(saved));

    expect(updateNotificationPreferences).toHaveBeenCalledWith(saved);
    await waitFor(() => expect(result.current.read.data).toEqual(saved));
  });
});
