import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMatchPreferences } from './useMatchPreferences';

const authState = { isAuthenticated: false };

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({ isAuthenticated: authState.isAuthenticated }),
  };
});

const apiGet = vi.fn();
vi.mock('@/services', () => ({
  apiService: {
    get: (...args: unknown[]) => apiGet(...args),
  },
}));

beforeEach(() => {
  authState.isAuthenticated = false;
  apiGet.mockReset();
});

describe('useMatchPreferences', () => {
  it('reports no preferences for signed-out users and does not call the API', () => {
    const { result } = renderHook(() => useMatchPreferences());
    expect(result.current.hasPreferences).toBe(false);
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('reports preferences when the profile has at least one preferred list populated', async () => {
    authState.isAuthenticated = true;
    apiGet.mockResolvedValueOnce({ data: { preferred_types: ['dog'] } });
    const { result } = renderHook(() => useMatchPreferences());
    await waitFor(() => expect(result.current.hasPreferences).toBe(true));
  });

  it('reports no preferences when the profile is the empty placeholder', async () => {
    authState.isAuthenticated = true;
    apiGet.mockResolvedValueOnce({ data: { lifestyle: {} } });
    const { result } = renderHook(() => useMatchPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasPreferences).toBe(false);
  });

  it('treats an empty preferred_types array as no preferences', async () => {
    authState.isAuthenticated = true;
    apiGet.mockResolvedValueOnce({
      data: {
        preferred_types: [],
        preferred_sizes: [],
        preferred_age_groups: [],
        preferred_energy: [],
      },
    });
    const { result } = renderHook(() => useMatchPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasPreferences).toBe(false);
  });

  it('reports no preferences if the API fails', async () => {
    authState.isAuthenticated = true;
    apiGet.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useMatchPreferences());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasPreferences).toBe(false);
  });
});
