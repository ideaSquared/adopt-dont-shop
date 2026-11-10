import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

const getMatchProfile = vi.fn();
vi.mock('@/services', () => ({
  matchingService: {
    getMatchProfile: (...args: unknown[]) => getMatchProfile(...args),
  },
}));

const renderPreferences = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useMatchPreferences(), { wrapper });
};

beforeEach(() => {
  authState.isAuthenticated = false;
  getMatchProfile.mockReset();
});

describe('useMatchPreferences', () => {
  it('reports no preferences for signed-out users and does not call the API', () => {
    const { result } = renderPreferences();
    expect(result.current.hasPreferences).toBe(false);
    expect(getMatchProfile).not.toHaveBeenCalled();
  });

  it('reports preferences when the profile has at least one preferred list populated', async () => {
    authState.isAuthenticated = true;
    getMatchProfile.mockResolvedValueOnce({ preferred_types: ['dog'] });
    const { result } = renderPreferences();
    await waitFor(() => expect(result.current.hasPreferences).toBe(true));
  });

  it('reports no preferences when the profile is the empty placeholder', async () => {
    authState.isAuthenticated = true;
    getMatchProfile.mockResolvedValueOnce({ lifestyle: {} });
    const { result } = renderPreferences();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasPreferences).toBe(false);
  });

  it('treats an empty preferred_types array as no preferences', async () => {
    authState.isAuthenticated = true;
    getMatchProfile.mockResolvedValueOnce({
      preferred_types: [],
      preferred_sizes: [],
      preferred_age_groups: [],
      preferred_energy: [],
    });
    const { result } = renderPreferences();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasPreferences).toBe(false);
  });

  it('reports no preferences if the API fails', async () => {
    authState.isAuthenticated = true;
    getMatchProfile.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderPreferences();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasPreferences).toBe(false);
  });
});
