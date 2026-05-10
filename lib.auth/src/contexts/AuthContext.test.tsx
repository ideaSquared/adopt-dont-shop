import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthResponse, LoginRequest, User } from '../types';

// Module-level mock state lets each test stub out auth-service behaviour
// before mounting AuthProvider. Using vi.hoisted because vi.mock factories
// run before imports and need their references defined first.
const mockAuthService = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  isAuthenticated: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  setToken: vi.fn(),
  clearTokens: vi.fn(),
  getToken: vi.fn(),
}));

vi.mock('../services/auth-service', () => ({
  authService: mockAuthService,
  AuthService: vi.fn(),
}));

vi.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: {
    updateConfig: vi.fn(),
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    fetchWithAuth: vi.fn(),
  },
}));

// Imported AFTER vi.mock so the mocks are wired in.
import { AuthProvider } from './AuthContext';
import { useAuth } from '../hooks/useAuth';

const adopterUser: User = {
  userId: 'user-123',
  email: 'adopter@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  emailVerified: true,
  userType: 'adopter',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const devUser: User = {
  userId: 'dev-user-456',
  email: 'dev@example.com',
  firstName: 'Dev',
  lastName: 'User',
  emailVerified: true,
  userType: 'adopter',
  status: 'active',
  createdAt: '2024-01-02T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

const buildAuthResponse = (user: User): AuthResponse => ({
  user,
  token: 'mock-token',
  expiresIn: 3600,
  accessToken: 'mock-token',
});

// Stable reference so re-renders don't re-trigger the effect that watches it.
const ALLOWED_ADOPTER: User['userType'][] = ['adopter'];

// Helper child that exposes login() so a test can call it imperatively from
// within the provider.
type LoginTriggerProps = {
  credentials: LoginRequest;
  onReady: (login: () => Promise<void>) => void;
};

const LoginTrigger = ({ credentials, onReady }: LoginTriggerProps) => {
  const { login } = useAuth();
  React.useEffect(() => {
    onReady(() => login(credentials));
  }, [login, credentials, onReady]);
  return null;
};

describe('AuthProvider auth_session_authenticated event', () => {
  beforeEach(() => {
    // Default: no rehydrated user — fresh-mount path is dormant unless a
    // test configures one of the rehydrate sources.
    mockAuthService.getCurrentUser.mockReturnValue(null);
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.getProfile.mockResolvedValue(null);
    mockAuthService.logout.mockResolvedValue(undefined);
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fires auth_session_authenticated after a successful fresh login', async () => {
    const onAuthEvent = vi.fn();
    mockAuthService.login.mockResolvedValue(buildAuthResponse(adopterUser));

    let triggerLogin: (() => Promise<void>) | undefined;

    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client" onAuthEvent={onAuthEvent}>
        <LoginTrigger
          credentials={{ email: adopterUser.email, password: 'pw' }}
          onReady={(fn) => {
            triggerLogin = fn;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(triggerLogin).toBeDefined();
    });

    await act(async () => {
      await triggerLogin?.();
    });

    expect(onAuthEvent).toHaveBeenCalledWith('auth_session_authenticated', {
      user_id: adopterUser.userId,
      user_type: adopterUser.userType,
      email: adopterUser.email,
    });

    const sessionEventCalls = onAuthEvent.mock.calls.filter(
      ([event]) => event === 'auth_session_authenticated'
    );
    expect(sessionEventCalls).toHaveLength(1);
  });

  it('fires auth_session_authenticated once when rehydrating a real user on mount', async () => {
    const onAuthEvent = vi.fn();
    mockAuthService.getCurrentUser.mockReturnValue(adopterUser);
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.getProfile.mockResolvedValue(adopterUser);

    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client" onAuthEvent={onAuthEvent}>
        <></>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(onAuthEvent).toHaveBeenCalledWith('auth_session_authenticated', {
        user_id: adopterUser.userId,
        user_type: adopterUser.userType,
        email: adopterUser.email,
      });
    });

    const sessionEventCalls = onAuthEvent.mock.calls.filter(
      ([event]) => event === 'auth_session_authenticated'
    );
    expect(sessionEventCalls).toHaveLength(1);
  });

  it('fires auth_session_authenticated once when rehydrating a dev user on mount', async () => {
    vi.stubEnv('DEV', true);

    const onAuthEvent = vi.fn();
    window.localStorage.setItem('dev_user', JSON.stringify(devUser));

    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client" onAuthEvent={onAuthEvent}>
        <></>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(onAuthEvent).toHaveBeenCalledWith('auth_session_authenticated', {
        user_id: devUser.userId,
        user_type: devUser.userType,
        email: devUser.email,
      });
    });

    // Dev branch returns early — getProfile must NOT be consulted.
    expect(mockAuthService.getProfile).not.toHaveBeenCalled();

    const sessionEventCalls = onAuthEvent.mock.calls.filter(
      ([event]) => event === 'auth_session_authenticated'
    );
    expect(sessionEventCalls).toHaveLength(1);
  });

  it('does not re-fire auth_session_authenticated when the provider re-renders', async () => {
    const onAuthEvent = vi.fn();
    mockAuthService.getCurrentUser.mockReturnValue(adopterUser);
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.getProfile.mockResolvedValue(adopterUser);

    const { rerender } = render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client" onAuthEvent={onAuthEvent}>
        <></>
      </AuthProvider>
    );

    await waitFor(() => {
      const calls = onAuthEvent.mock.calls.filter(
        ([event]) => event === 'auth_session_authenticated'
      );
      expect(calls).toHaveLength(1);
    });

    // Re-render with the SAME stable allowedUserTypes reference. The init
    // effect is keyed on that array, so the event must not fire again.
    rerender(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client" onAuthEvent={onAuthEvent}>
        <span>child changed</span>
      </AuthProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    const sessionEventCalls = onAuthEvent.mock.calls.filter(
      ([event]) => event === 'auth_session_authenticated'
    );
    expect(sessionEventCalls).toHaveLength(1);
  });
});
