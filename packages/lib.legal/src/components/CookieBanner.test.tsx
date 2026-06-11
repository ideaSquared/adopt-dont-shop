import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from '@adopt-dont-shop/lib.auth';
import { CookieBanner, useCookieConsent } from './CookieBanner';
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
const recordCookiesConsentMock = vi.fn();
const setAnalyticsConsentMock = vi.fn();

vi.mock('../services/legal-service', () => ({
  fetchCookiesVersion: () => fetchCookiesVersionMock(),
  recordCookiesConsent: (input: unknown) => recordCookiesConsentMock(input),
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
    recordCookiesConsentMock.mockReset();
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
    expect(recordCookiesConsentMock).not.toHaveBeenCalled();
  });

  it('calls the consent API for authenticated users with the captured cookies version + analytics flag', async () => {
    authState.user = baseUser;
    authState.isAuthenticated = true;
    recordCookiesConsentMock.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<CookieBanner />);

    await user.click(await screen.findByTestId('cookie-banner-accept-all'));

    await waitFor(() => {
      expect(recordCookiesConsentMock).toHaveBeenCalledTimes(1);
    });
    // ADS-550: cookies-only path — the payload must NOT carry
    // tosAccepted/privacyAccepted.
    expect(recordCookiesConsentMock).toHaveBeenCalledWith({
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

  describe('accessibility', () => {
    it('exposes the banner as a landmark region with an accessible name', async () => {
      render(<CookieBanner />);

      const region = await screen.findByRole('region', { name: /cookie preferences/i });
      expect(region).toBe(screen.getByTestId('cookie-banner'));
    });

    it('gives every action button a non-empty accessible name', async () => {
      render(<CookieBanner />);

      expect(await screen.findByRole('button', { name: /accept all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /essentials only/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /manage preferences/i })).toBeInTheDocument();
    });

    it('does not auto-focus the banner on mount (page underneath stays usable)', async () => {
      render(<CookieBanner />);

      const banner = await screen.findByTestId('cookie-banner');
      expect(banner).not.toContainElement(document.activeElement);
      expect(document.activeElement).toBe(document.body);
    });

    it('tabs through Accept all → Essentials only → Manage preferences (collapsed state)', async () => {
      const user = userEvent.setup();
      render(<CookieBanner />);

      // Seed focus on the first action so we can deterministically Tab forward
      // past it (the description contains a focusable cookies-policy link that
      // sits earlier in DOM order).
      const acceptAll = await screen.findByRole('button', { name: /accept all/i });
      acceptAll.focus();
      expect(acceptAll).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /essentials only/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /manage preferences/i })).toHaveFocus();
    });

    it('extends tab order into Analytics toggle → Save preferences when disclosure is expanded', async () => {
      const user = userEvent.setup();
      render(<CookieBanner />);

      const manage = await screen.findByRole('button', { name: /manage preferences/i });
      await user.click(manage);
      // Seed focus at the disclosure trigger so we can step forward into the
      // newly-visible disclosure controls deterministically.
      const trigger = screen.getByRole('button', { name: /hide preferences/i });
      trigger.focus();

      await user.tab(); // → Analytics toggle
      expect(screen.getByTestId('cookie-banner-analytics-toggle')).toHaveFocus();

      await user.tab(); // → Save preferences
      expect(screen.getByRole('button', { name: /save preferences/i })).toHaveFocus();
    });

    it('exposes aria-expanded + aria-controls on the disclosure trigger and toggles them', async () => {
      const user = userEvent.setup();
      render(<CookieBanner />);

      const manage = await screen.findByRole('button', { name: /manage preferences/i });
      expect(manage).toHaveAttribute('aria-expanded', 'false');
      const controlsId = manage.getAttribute('aria-controls');
      expect(controlsId).toBeTruthy();

      await user.click(manage);
      expect(manage).toHaveAttribute('aria-expanded', 'true');
      expect(controlsId !== null && document.getElementById(controlsId)).toBeTruthy();
    });

    it('toggles the analytics checkbox via Space when keyboard-focused', async () => {
      const user = userEvent.setup();
      render(<CookieBanner />);

      await user.click(await screen.findByRole('button', { name: /manage preferences/i }));
      const toggle = await screen.findByTestId('cookie-banner-analytics-toggle');
      toggle.focus();
      expect(toggle).not.toBeChecked();

      await user.keyboard(' ');
      expect(toggle).toBeChecked();

      await user.keyboard(' ');
      expect(toggle).not.toBeChecked();
    });

    it('uses an associated label so the analytics toggle has an accessible name', async () => {
      const user = userEvent.setup();
      render(<CookieBanner />);

      await user.click(await screen.findByRole('button', { name: /manage preferences/i }));
      const toggle = await screen.findByRole('checkbox', { name: /analytics/i });
      expect(toggle).toBe(screen.getByTestId('cookie-banner-analytics-toggle'));
    });

    it('closes the disclosure on Escape and returns focus to the trigger', async () => {
      const user = userEvent.setup();
      render(<CookieBanner />);

      const manage = await screen.findByRole('button', { name: /manage preferences/i });
      await user.click(manage);
      const toggle = await screen.findByTestId('cookie-banner-analytics-toggle');
      toggle.focus();

      await user.keyboard('{Escape}');

      expect(screen.queryByTestId('cookie-banner-analytics-toggle')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /manage preferences/i })).toHaveFocus();
    });
  });
});

describe('useCookieConsent [ADS-553]', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  const writeRecord = (record: StoredCookieConsent): void => {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
  };

  it('returns the initial stored choice on mount', () => {
    writeRecord({
      cookiesVersion: '2026-05-09-v1',
      analyticsConsent: true,
      acceptedAt: '2026-05-10T08:00:00.000Z',
    });

    const { result } = renderHook(() => useCookieConsent());

    expect(result.current.hasDecided).toBe(true);
    expect(result.current.analyticsConsent).toBe(true);
  });

  it('re-renders when the banner records a fresh choice (cleared event)', () => {
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.hasDecided).toBe(false);

    act(() => {
      writeRecord({
        cookiesVersion: '2026-05-09-v1',
        analyticsConsent: false,
        acceptedAt: '2026-05-10T08:00:00.000Z',
      });
      window.dispatchEvent(new Event(`${COOKIE_CONSENT_STORAGE_KEY}:cleared`));
    });

    expect(result.current.hasDecided).toBe(true);
    expect(result.current.analyticsConsent).toBe(false);
  });

  it('re-renders when another tab writes the storage key (cross-tab propagation)', () => {
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.hasDecided).toBe(false);

    act(() => {
      writeRecord({
        cookiesVersion: '2026-05-09-v1',
        analyticsConsent: true,
        acceptedAt: '2026-05-10T08:00:00.000Z',
      });
      // Browsers fire `storage` on other tabs when one tab writes. We
      // simulate the cross-tab event directly so we don't depend on a
      // BroadcastChannel-driven shim.
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: COOKIE_CONSENT_STORAGE_KEY,
          newValue: window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY),
        })
      );
    });

    expect(result.current.hasDecided).toBe(true);
    expect(result.current.analyticsConsent).toBe(true);
  });

  it('ignores `storage` events for unrelated keys', () => {
    writeRecord({
      cookiesVersion: '2026-05-09-v1',
      analyticsConsent: true,
      acceptedAt: '2026-05-10T08:00:00.000Z',
    });
    const { result, rerender } = renderHook(() => useCookieConsent());
    const before = result.current;

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'other-key', newValue: 'whatever' }));
    });
    rerender();

    // No identity change — the snapshot cache returns the same record
    // when the bytes haven't changed.
    expect(result.current.hasDecided).toBe(before.hasDecided);
    expect(result.current.analyticsConsent).toBe(before.analyticsConsent);
  });

  it('openPreferences clears storage and dispatches the cleared event', () => {
    writeRecord({
      cookiesVersion: '2026-05-09-v1',
      analyticsConsent: true,
      acceptedAt: '2026-05-10T08:00:00.000Z',
    });
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.hasDecided).toBe(true);

    act(() => {
      result.current.openPreferences();
    });

    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
    expect(result.current.hasDecided).toBe(false);
  });
});
