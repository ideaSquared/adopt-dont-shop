/**
 * ADS C4-6: behaviour test for the rescue application list's real-time path.
 *
 * The hook still polls / refetches on filter changes, but it now ALSO
 * subscribes to backend socket events (`application_created`,
 * `application_updated`) and refetches when either fires.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getApplicationsMock = vi.fn();

vi.mock('../services/applicationService', () => ({
  RescueApplicationService: class {
    getApplications = getApplicationsMock;
  },
}));

// Capture each event handler the hook subscribes with so we can fire them.
const handlers: Record<string, ((p: unknown) => void) | undefined> = {};

vi.mock('@adopt-dont-shop/lib.analytics', () => ({
  useRealtimeAnalytics: (event: string, handler: (p: unknown) => void) => {
    handlers[event] = handler;
  },
}));

import { useApplications } from './useApplications';

describe('useApplications (C4-6)', () => {
  beforeEach(() => {
    getApplicationsMock.mockReset();
    getApplicationsMock.mockResolvedValue({ applications: [], total: 0, totalPages: 0 });
    handlers.application_created = undefined;
    handlers.application_updated = undefined;
  });

  it('subscribes to application_created and application_updated', () => {
    renderHook(() => useApplications());
    expect(handlers.application_created).toBeDefined();
    expect(handlers.application_updated).toBeDefined();
  });

  it('refetches when application_created fires', async () => {
    renderHook(() => useApplications());

    await waitFor(() => {
      expect(getApplicationsMock).toHaveBeenCalledTimes(1);
    });

    handlers.application_created?.({ applicationId: 'app-99' });

    await waitFor(() => {
      expect(getApplicationsMock).toHaveBeenCalledTimes(2);
    });
  });

  it('refetches when application_updated fires', async () => {
    renderHook(() => useApplications());

    await waitFor(() => {
      expect(getApplicationsMock).toHaveBeenCalledTimes(1);
    });

    handlers.application_updated?.({ applicationId: 'app-99' });

    await waitFor(() => {
      expect(getApplicationsMock).toHaveBeenCalledTimes(2);
    });
  });
});
