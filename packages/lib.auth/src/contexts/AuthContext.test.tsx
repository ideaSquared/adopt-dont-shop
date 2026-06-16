import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEYS, type AuthResponse, type LoginRequest, type User } from '../types';

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
    clearCsrfToken: vi.fn(),
    setRefreshHandler: vi.fn(),
  },
}));

// C2-5: stub the toast bridge so the session-expired notification is
// observable without dragging in sonner's real toast machinery.
const mockToastError = vi.hoisted(() => vi.fn());
vi.mock('@adopt-dont-shop/lib.components', () => ({
  toast: { error: mockToastError },
}));

// Imported AFTER vi.mock so the mocks are wired in.
import { AuthProvider } from './AuthContext';
import { useAuth } from '../hooks/useAuth';
import { apiService as mockedApiService } from '@adopt-dont-shop/lib.api';

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

// Helper child that exposes logout() so a test can call it imperatively.
type LogoutTriggerProps = {
  onReady: (logout: () => Promise<void>) => void;
};

const LogoutTrigger = ({ onReady }: LogoutTriggerProps) => {
  const { logout } = useAuth();
  React.useEffect(() => {
    onReady(logout);
  }, [logout, onReady]);
  return null;
};

describe('AuthProvider onLogout callback', () => {
  beforeEach(() => {
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

  it('invokes onLogout after a successful logout so apps can wipe their query cache', async () => {
    const onLogout = vi.fn();
    let triggerLogout: (() => Promise<void>) | undefined;

    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client" onLogout={onLogout}>
        <LogoutTrigger
          onReady={(fn) => {
            triggerLogout = fn;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(triggerLogout).toBeDefined();
    });

    await act(async () => {
      await triggerLogout?.();
    });

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('clears the cached CSRF token during logout', async () => {
    let triggerLogout: (() => Promise<void>) | undefined;

    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client">
        <LogoutTrigger
          onReady={(fn) => {
            triggerLogout = fn;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(triggerLogout).toBeDefined();
    });

    vi.mocked(mockedApiService.clearCsrfToken).mockClear();

    await act(async () => {
      await triggerLogout?.();
    });

    expect(mockedApiService.clearCsrfToken).toHaveBeenCalled();
  });

  it('clears the dev mock tokens (stored under the __dev_* keys) on logout', async () => {
    vi.stubEnv('DEV', true);
    const devUser = { userId: 'dev-1', email: 'dev@example.com' };
    window.localStorage.setItem('dev_user', JSON.stringify(devUser));
    // The setters write the mock token under STORAGE_KEYS.* — cleanup must
    // read/remove the SAME keys, not the bare 'accessToken'/'authToken'.
    window.localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'dev-token-dev-1-123');
    window.localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'dev-token-dev-1-123');

    let triggerLogout: (() => Promise<void>) | undefined;
    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client">
        <LogoutTrigger
          onReady={(fn) => {
            triggerLogout = fn;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(triggerLogout).toBeDefined();
    });

    await act(async () => {
      await triggerLogout?.();
    });

    expect(window.localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
  });

  it('invokes onLogout even when the backend logout call fails', async () => {
    mockAuthService.logout.mockRejectedValueOnce(new Error('network down'));

    const onLogout = vi.fn();
    let triggerLogout: (() => Promise<void>) | undefined;

    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client" onLogout={onLogout}>
        <LogoutTrigger
          onReady={(fn) => {
            triggerLogout = fn;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(triggerLogout).toBeDefined();
    });

    await act(async () => {
      await triggerLogout?.();
    });

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});

// Probe child that surfaces the current authenticated user state so tests
// can assert what the provider exposes after a cross-tab event.
const AuthProbe = ({ onState }: { onState: (user: User | null) => void }) => {
  const { user } = useAuth();
  React.useEffect(() => {
    onState(user);
  }, [user, onState]);
  return null;
};

describe('AuthProvider cross-tab logout synchronization', () => {
  beforeEach(() => {
    mockAuthService.getCurrentUser.mockReturnValue(adopterUser);
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.getProfile.mockResolvedValue(adopterUser);
    mockAuthService.logout.mockResolvedValue(undefined);
    mockAuthService.clearTokens.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('clears local user state when another tab removes the persisted user key', async () => {
    const states: Array<User | null> = [];

    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client">
        <AuthProbe onState={(u) => states.push(u)} />
      </AuthProvider>
    );

    // Wait until the rehydrate effect has populated the user.
    await waitFor(() => {
      expect(states[states.length - 1]?.userId).toBe(adopterUser.userId);
    });

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'user',
          newValue: null,
          oldValue: JSON.stringify(adopterUser),
        })
      );
    });

    await waitFor(() => {
      expect(states[states.length - 1]).toBeNull();
    });
    expect(mockAuthService.clearTokens).toHaveBeenCalled();
  });

  it('ignores storage events for unrelated keys', async () => {
    const states: Array<User | null> = [];

    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client">
        <AuthProbe onState={(u) => states.push(u)} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(states[states.length - 1]?.userId).toBe(adopterUser.userId);
    });

    mockAuthService.clearTokens.mockClear();

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'theme-preference',
          newValue: null,
          oldValue: 'dark',
        })
      );
    });

    expect(states[states.length - 1]?.userId).toBe(adopterUser.userId);
    expect(mockAuthService.clearTokens).not.toHaveBeenCalled();
  });

  it('ignores storage events that set a non-null value', async () => {
    const states: Array<User | null> = [];

    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client">
        <AuthProbe onState={(u) => states.push(u)} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(states[states.length - 1]?.userId).toBe(adopterUser.userId);
    });

    mockAuthService.clearTokens.mockClear();

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'user',
          newValue: JSON.stringify(adopterUser),
          oldValue: JSON.stringify(adopterUser),
        })
      );
    });

    expect(states[states.length - 1]?.userId).toBe(adopterUser.userId);
    expect(mockAuthService.clearTokens).not.toHaveBeenCalled();
  });
});

// C2-5: surface a toast when a 401 fires for an authenticated user so
// the session-expired redirect doesn't appear to come out of nowhere.
describe('AuthProvider session-expiry toast [C2-5]', () => {
  beforeEach(() => {
    mockAuthService.getCurrentUser.mockReturnValue(adopterUser);
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.getProfile.mockResolvedValue(adopterUser);
    mockAuthService.clearTokens.mockReset();
    mockToastError.mockClear();
    window.localStorage.clear();
  });

  // Grab the latest onUnauthorized callback the provider registered.
  const getOnUnauthorized = (): (() => void) | undefined => {
    const updateConfigMock = vi.mocked(mockedApiService.updateConfig);
    for (let i = updateConfigMock.mock.calls.length - 1; i >= 0; i--) {
      const arg = updateConfigMock.mock.calls[i][0];
      if (arg && typeof arg.onUnauthorized === 'function') {
        return arg.onUnauthorized;
      }
    }
    return undefined;
  };

  it('shows the session-expired toast when a 401 fires for a signed-in user', async () => {
    const states: Array<User | null> = [];

    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client">
        <AuthProbe onState={(u) => states.push(u)} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(states[states.length - 1]?.userId).toBe(adopterUser.userId);
    });

    const onUnauthorized = getOnUnauthorized();
    expect(onUnauthorized).toBeDefined();

    await act(async () => {
      onUnauthorized?.();
    });

    expect(mockToastError).toHaveBeenCalledWith('Your session has expired. Please log in again.');
    expect(mockAuthService.clearTokens).toHaveBeenCalled();
    await waitFor(() => {
      expect(states[states.length - 1]).toBeNull();
    });
  });

  it('does not show the toast when a 401 fires before the user is signed in', async () => {
    mockAuthService.getCurrentUser.mockReturnValue(null);
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.getProfile.mockResolvedValue(null);

    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client">
        <></>
      </AuthProvider>
    );

    // Wait for the rehydrate effect (which would set user) to finish.
    await waitFor(() => {
      expect(getOnUnauthorized()).toBeDefined();
    });

    const onUnauthorized = getOnUnauthorized();
    await act(async () => {
      onUnauthorized?.();
    });

    expect(mockToastError).not.toHaveBeenCalled();
  });
});

// Probe child that exposes the full auth context so tests can drive any
// method imperatively and read back the resulting user state.
type ContextProbeProps = {
  onReady: (ctx: ReturnType<typeof useAuth>) => void;
};

const ContextProbe = ({ onReady }: ContextProbeProps) => {
  const ctx = useAuth();
  React.useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return null;
};

const rescueStaffUser: User = {
  ...adopterUser,
  userId: 'staff-789',
  email: 'staff@example.com',
  userType: 'rescue_staff',
};

describe('AuthProvider login app-type enforcement', () => {
  beforeEach(() => {
    mockAuthService.getCurrentUser.mockReturnValue(null);
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.getProfile.mockResolvedValue(null);
    mockAuthService.logout.mockResolvedValue(undefined);
    mockToastError.mockClear();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects a user whose type is not allowed in this app and logs them out', async () => {
    mockAuthService.login.mockResolvedValue(buildAuthResponse(rescueStaffUser));
    const onAuthEvent = vi.fn();

    let triggerLogin: (() => Promise<void>) | undefined;
    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client" onAuthEvent={onAuthEvent}>
        <LoginTrigger
          credentials={{ email: rescueStaffUser.email, password: 'pw' }}
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
      await expect(triggerLogin?.()).rejects.toThrow(/please use the Rescue App/i);
    });

    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(onAuthEvent).toHaveBeenCalledWith(
      'auth_wrong_app_access',
      expect.objectContaining({ user_type: 'rescue_staff', expected_app: 'client' })
    );
    expect(onAuthEvent).toHaveBeenCalledWith(
      'auth_login_failed',
      expect.objectContaining({ email: rescueStaffUser.email })
    );
  });

  it('emits a login_failed event and rethrows when the credentials are rejected', async () => {
    mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));
    const onAuthEvent = vi.fn();

    let triggerLogin: (() => Promise<void>) | undefined;
    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client" onAuthEvent={onAuthEvent}>
        <LoginTrigger
          credentials={{ email: adopterUser.email, password: 'wrong' }}
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
      await expect(triggerLogin?.()).rejects.toThrow('Invalid credentials');
    });

    expect(onAuthEvent).toHaveBeenCalledWith(
      'auth_login_failed',
      expect.objectContaining({ email: adopterUser.email, error_message: 'Invalid credentials' })
    );
  });
});

describe('AuthProvider register', () => {
  beforeEach(() => {
    mockAuthService.getCurrentUser.mockReturnValue(null);
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.getProfile.mockResolvedValue(null);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers without signing the user in and emits a success event with the app default user type', async () => {
    mockAuthService.register.mockResolvedValue({ user: adopterUser, message: 'check your email' });
    const onAuthEvent = vi.fn();
    const states: Array<User | null> = [];

    let ctx: ReturnType<typeof useAuth> | undefined;
    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client" onAuthEvent={onAuthEvent}>
        <ContextProbe
          onReady={(c) => {
            ctx = c;
          }}
        />
        <AuthProbe onState={(u) => states.push(u)} />
      </AuthProvider>
    );

    await waitFor(() => expect(ctx).toBeDefined());

    await act(async () => {
      await ctx?.register({
        email: 'new@example.com',
        password: 'pw',
        firstName: 'New',
        lastName: 'User',
      });
    });

    expect(mockAuthService.register).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@example.com', userType: 'adopter' })
    );
    // ADS-538: register must NOT sign the user in.
    expect(states[states.length - 1]).toBeNull();
    expect(onAuthEvent).toHaveBeenCalledWith(
      'auth_registration_successful',
      expect.objectContaining({ email: 'new@example.com', user_type: 'adopter' })
    );
  });

  it('emits a registration_failed event and rethrows when registration fails', async () => {
    mockAuthService.register.mockRejectedValue(new Error('Email already in use'));
    const onAuthEvent = vi.fn();

    let ctx: ReturnType<typeof useAuth> | undefined;
    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client" onAuthEvent={onAuthEvent}>
        <ContextProbe
          onReady={(c) => {
            ctx = c;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => expect(ctx).toBeDefined());

    await act(async () => {
      await expect(
        ctx?.register({
          email: 'dupe@example.com',
          password: 'pw',
          firstName: 'A',
          lastName: 'B',
        })
      ).rejects.toThrow('Email already in use');
    });

    expect(onAuthEvent).toHaveBeenCalledWith(
      'auth_registration_failed',
      expect.objectContaining({ email: 'dupe@example.com', error_message: 'Email already in use' })
    );
  });
});

describe('AuthProvider updateProfile', () => {
  beforeEach(() => {
    mockAuthService.getCurrentUser.mockReturnValue(adopterUser);
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.getProfile.mockResolvedValue(adopterUser);
    mockAuthService.updateProfile.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('persists the updated user returned by the service', async () => {
    const updated = { ...adopterUser, firstName: 'Grace' };
    mockAuthService.updateProfile.mockResolvedValue(updated);
    const states: Array<User | null> = [];

    let ctx: ReturnType<typeof useAuth> | undefined;
    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client">
        <ContextProbe
          onReady={(c) => {
            ctx = c;
          }}
        />
        <AuthProbe onState={(u) => states.push(u)} />
      </AuthProvider>
    );

    await waitFor(() => expect(states[states.length - 1]?.userId).toBe(adopterUser.userId));

    await act(async () => {
      await ctx?.updateProfile({ firstName: 'Grace' });
    });

    expect(mockAuthService.updateProfile).toHaveBeenCalledWith({ firstName: 'Grace' });
    await waitFor(() => expect(states[states.length - 1]?.firstName).toBe('Grace'));
  });

  it('throws when no user is logged in', async () => {
    mockAuthService.getCurrentUser.mockReturnValue(null);
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.getProfile.mockResolvedValue(null);

    let ctx: ReturnType<typeof useAuth> | undefined;
    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client">
        <ContextProbe
          onReady={(c) => {
            ctx = c;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => expect(ctx).toBeDefined());

    await act(async () => {
      await expect(ctx?.updateProfile({ firstName: 'Grace' })).rejects.toThrow('No user logged in');
    });

    expect(mockAuthService.updateProfile).not.toHaveBeenCalled();
  });
});

describe('AuthProvider refreshUser', () => {
  beforeEach(() => {
    mockAuthService.getCurrentUser.mockReturnValue(adopterUser);
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.getProfile.mockResolvedValue(adopterUser);
    mockAuthService.logout.mockResolvedValue(undefined);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('updates the user with fresh data from the API', async () => {
    const states: Array<User | null> = [];
    let ctx: ReturnType<typeof useAuth> | undefined;

    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client">
        <ContextProbe
          onReady={(c) => {
            ctx = c;
          }}
        />
        <AuthProbe onState={(u) => states.push(u)} />
      </AuthProvider>
    );

    await waitFor(() => expect(states[states.length - 1]?.userId).toBe(adopterUser.userId));

    const refreshed = { ...adopterUser, lastName: 'Hopper' };
    mockAuthService.getProfile.mockResolvedValue(refreshed);

    await act(async () => {
      await ctx?.refreshUser();
    });

    await waitFor(() => expect(states[states.length - 1]?.lastName).toBe('Hopper'));
  });

  it('does nothing when there is no authenticated session', async () => {
    mockAuthService.getCurrentUser.mockReturnValue(null);
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.getProfile.mockResolvedValue(null);

    let ctx: ReturnType<typeof useAuth> | undefined;
    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client">
        <ContextProbe
          onReady={(c) => {
            ctx = c;
          }}
        />
      </AuthProvider>
    );

    await waitFor(() => expect(ctx).toBeDefined());

    mockAuthService.getProfile.mockClear();

    await act(async () => {
      await ctx?.refreshUser();
    });

    // isAuthenticated() short-circuits before any profile fetch.
    expect(mockAuthService.getProfile).not.toHaveBeenCalled();
  });

  it('logs the user out when the refreshed profile is no longer an allowed type', async () => {
    const states: Array<User | null> = [];
    let ctx: ReturnType<typeof useAuth> | undefined;

    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client">
        <ContextProbe
          onReady={(c) => {
            ctx = c;
          }}
        />
        <AuthProbe onState={(u) => states.push(u)} />
      </AuthProvider>
    );

    await waitFor(() => expect(states[states.length - 1]?.userId).toBe(adopterUser.userId));

    mockAuthService.getProfile.mockResolvedValue(rescueStaffUser);

    await act(async () => {
      await ctx?.refreshUser();
    });

    expect(mockAuthService.logout).toHaveBeenCalled();
    await waitFor(() => expect(states[states.length - 1]).toBeNull());
  });

  it('logs the user out when the refresh request fails', async () => {
    let ctx: ReturnType<typeof useAuth> | undefined;
    const states: Array<User | null> = [];

    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client">
        <ContextProbe
          onReady={(c) => {
            ctx = c;
          }}
        />
        <AuthProbe onState={(u) => states.push(u)} />
      </AuthProvider>
    );

    await waitFor(() => expect(states[states.length - 1]?.userId).toBe(adopterUser.userId));

    mockAuthService.getProfile.mockRejectedValue(new Error('network error'));

    await act(async () => {
      await ctx?.refreshUser();
    });

    expect(mockAuthService.logout).toHaveBeenCalled();
  });
});

describe('AuthProvider mount rehydration with disallowed user type', () => {
  beforeEach(() => {
    mockAuthService.logout.mockResolvedValue(undefined);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('logs out a rehydrated user whose type is not allowed in this app', async () => {
    mockAuthService.getCurrentUser.mockReturnValue(rescueStaffUser);
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.getProfile.mockResolvedValue(rescueStaffUser);

    const states: Array<User | null> = [];
    render(
      <AuthProvider allowedUserTypes={ALLOWED_ADOPTER} appType="client">
        <AuthProbe onState={(u) => states.push(u)} />
      </AuthProvider>
    );

    await waitFor(() => expect(mockAuthService.logout).toHaveBeenCalled());
    expect(states[states.length - 1]).toBeNull();
  });
});
