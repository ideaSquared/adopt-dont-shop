import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from '@adopt-dont-shop/lib.auth';
import { CookieBanner } from './CookieBanner';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  type StoredCookieConsent,
} from '../services/cookie-consent-storage';

const CURRENT_VERSION = '2026-05-09-v1';

type AuthState = { user: User | null; isAuthenticated: boolean };
const authState: AuthState = { user: null, isAuthenticated: false };

const baseUser: User = {
  userId: 'u-1',
  email: 'a@b.c',
  firstName: 'Sam',
  lastName: 'Doe',
  emailVerified: true,
  userType: 'adopter',
  status: 'active',
};

const fetchCookiesVersionMock = vi.fn();
const recordReacceptanceMock = vi.fn();
const setAnalyticsConsentMock = vi.fn();

vi.mock('../services/legal-service', () => ({
  fetchCookiesVersion: () => fetchCookiesVersionMock(),
  recordReacceptance: (input: unknown) => recordReacceptanceMock(input),
  // The banner imports these too — keep the mock surface complete to
  // avoid undefined-call traps during partial imports.
  fetchPendingReacceptance: vi.fn(),
}));

vi.mock('@adopt-dont-shop/lib.observability', () => ({
  setAnalyticsConsent: (state: unknown) => setAnalyticsConsentMock(state),
}));

vi.mock('@adopt-dont-shop/lib.auth', async () => {
  const actual = await vi.importActual<typeof import('@adopt-dont-shop/lib.auth')>(
    '@adopt-dont-shop/lib.auth'
  );
  return {
    ...actual,
    useAuth: () => ({
      user: authState.user,
      isAuthenticated: authState.isAuthenticated,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

const setStoredConsent = (record: StoredCookieConsent): void => {
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
};

const readStoredJson = (): StoredCookieConsent | null => {
  const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as StoredCookieConsent;
};

describe('CookieBanner [ADS-497 slice 5]', () => {
  beforeEach(() => {
    authState.user = null;
    authState.isAuthenticated = false;
    window.localStorage.clear();
    fetchCookiesVersionMock.mockReset();
    recordReacceptanceMock.mockReset();
    setAnalyticsConsentMock.mockReset();
    fetchCookiesVersionMock.mockResolvedValue(CURRENT_VERSION);
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders the bottom banner when no consent record exists for the current version', async () => {
    render(<CookieBanner />);

    expect(await screen.findByTestId('cookie-banner')).toBeInTheDocument();
    // Both primary actions are visible up-front (manage preferences is closed by default).
    expect(screen.getByTestId('cookie-banner-accept-all')).toBeInTheDocument();
    expect(screen.getByTestId('cookie-banner-essentials-only')).toBeInTheDocument();
    // The detailed analytics toggle is hidden until "Manage preferences" is clicked.
    expect(screen.queryByTestId('cookie-banner-analytics-toggle')).not.toBeInTheDocument();
  });

  it('does not render when a consent record exists for the current version', async () => {
    setStoredConsent({
      cookiesVersion: CURRENT_VERSION,
      analyticsConsent: false,
      acceptedAt: '2026-05-10T08:00:00.000Z',
    });

    render(<CookieBanner />);

    await waitFor(() => {
      expect(fetchCookiesVersionMock).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('cookie-banner')).not.toBeInTheDocument();
  });

  it('re-shows when the stored record is for an OLDER cookies version', async () => {
    setStoredConsent({
      cookiesVersion: '2025-01-01-old',
      analyticsConsent: true,
      acceptedAt: '2025-01-02T00:00:00.000Z',
    });

    render(<CookieBanner />);

    expect(await screen.findByTestId('cookie-banner')).toBeInTheDocument();
  });

  it('persists the choice to localStorage on "Accept all" and flips the observability gate', async () => {
    const user = userEvent.setup();
    render(<CookieBanner />);

    await user.click(await screen.findByTestId('cookie-banner-accept-all'));

    await waitFor(() => {
      const stored = readStoredJson();
      expect(stored).not.toBeNull();
    });
    const stored = readStoredJson();
    expect(stored?.cookiesVersion).toBe(CURRENT_VERSION);
    expect(stored?.analyticsConsent).toBe(true);
    expect(setAnalyticsConsentMock).toHaveBeenCalledWith('granted');
  });

  it('persists analytics OFF on "Essentials only" and denies the observability gate', async () => {
    const user = userEvent.setup();
    render(<CookieBanner />);

    await user.click(await screen.findByTestId('cookie-banner-essentials-only'));

    await waitFor(() => {
      const stored = readStoredJson();
      expect(stored?.analyticsConsent).toBe(false);
    });
    expect(setAnalyticsConsentMock).toHaveBeenCalledWith('denied');
  });

  it('does NOT pre-check the analytics toggle in the disclosure (opt-in default)', async () => {
    const user = userEvent.setup();
    render(<CookieBanner />);

    const banner = await screen.findByTestId('cookie-banner');
    await user.click(within(banner).getByTestId('cookie-banner-manage-preferences'));

    const toggle = await within(banner).findByTestId('cookie-banner-analytics-toggle');
    expect(toggle).not.toBeChecked();
  });

  it('records the explicit toggle state on "Save preferences" inside the disclosure', async () => {
    const user = userEvent.setup();
    render(<CookieBanner />);

    const banner = await screen.findByTestId('cookie-banner');
    await user.click(within(banner).getByTestId('cookie-banner-manage-preferences'));
    await user.click(await within(banner).findByTestId('cookie-banner-analytics-toggle'));
    await user.click(within(banner).getByTestId('cookie-banner-save-preferences'));

    await waitFor(() => {
      expect(readStoredJson()?.analyticsConsent).toBe(true);
    });
    expect(setAnalyticsConsentMock).toHaveBeenCalledWith('granted');
  });

  it('does not call the API for anonymous users', async () => {
    const user = userEvent.setup();
    render(<CookieBanner />);

    await user.click(await screen.findByTestId('cookie-banner-accept-all'));

    await waitFor(() => {
      expect(setAnalyticsConsentMock).toHaveBeenCalled();
    });
    expect(recordReacceptanceMock).not.toHaveBeenCalled();
  });

  it('calls the consent API for authenticated users with the captured cookies version + analytics flag', async () => {
    authState.user = baseUser;
    authState.isAuthenticated = true;
    recordReacceptanceMock.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<CookieBanner />);

    await user.click(await screen.findByTestId('cookie-banner-accept-all'));

    await waitFor(() => {
      expect(recordReacceptanceMock).toHaveBeenCalledTimes(1);
    });
    expect(recordReacceptanceMock).toHaveBeenCalledWith({
      tosAccepted: true,
      privacyAccepted: true,
      cookiesVersion: CURRENT_VERSION,
      analyticsConsent: true,
    });
  });

  it('stays hidden when the cookies-version fetch fails (no stale write)', async () => {
    fetchCookiesVersionMock.mockRejectedValue(new Error('network'));

    render(<CookieBanner />);

    // Wait long enough that the loading effect resolves into a no-op.
    await waitFor(() => {
      expect(fetchCookiesVersionMock).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('cookie-banner')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
  });
});
