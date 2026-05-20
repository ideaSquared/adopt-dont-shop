import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InstallPwaBanner } from './InstallPwaBanner';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const setUserAgent = (ua: string) => {
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    configurable: true,
    value: ua,
  });
};

const fireBeforeInstallPrompt = (overrides: Partial<BeforeInstallPromptEvent> = {}) => {
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
  event.prompt = overrides.prompt ?? vi.fn().mockResolvedValue(undefined);
  event.userChoice =
    overrides.userChoice ?? Promise.resolve({ outcome: 'accepted', platform: 'web' });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
};

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

describe('InstallPwaBanner', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockMatchMedia(false);
    setUserAgent(CHROME_UA);
    delete (navigator as Navigator & { standalone?: boolean }).standalone;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing by default on non-iOS without a beforeinstallprompt event', () => {
    render(<InstallPwaBanner appName="Adopt Don't Shop" />);
    expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
  });

  it('shows the Chromium install prompt when beforeinstallprompt fires', () => {
    render(<InstallPwaBanner appName='AdoptDS' />);
    fireBeforeInstallPrompt();

    expect(screen.getByTestId('pwa-install-banner')).toBeInTheDocument();
    expect(screen.getByText('Install AdoptDS')).toBeInTheDocument();
    expect(screen.getByTestId('pwa-install-banner-install')).toBeInTheDocument();
    expect(screen.getByTestId('pwa-install-banner-dismiss')).toBeInTheDocument();
  });

  it('calls prompt() and hides the banner when Install is clicked', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    render(<InstallPwaBanner appName='AdoptDS' />);
    fireBeforeInstallPrompt({
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('pwa-install-banner-install'));
    });

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
  });

  it('shows iOS instructions (no install button) when on iOS', () => {
    setUserAgent(IOS_UA);
    render(<InstallPwaBanner appName='AdoptDS' />);

    expect(screen.getByTestId('pwa-install-banner')).toBeInTheDocument();
    expect(screen.getByText(/Add to Home Screen/i)).toBeInTheDocument();
    expect(screen.queryByTestId('pwa-install-banner-install')).not.toBeInTheDocument();
  });

  it('hides itself when already running in standalone mode', () => {
    mockMatchMedia(true);
    render(<InstallPwaBanner appName='AdoptDS' />);
    fireBeforeInstallPrompt();

    expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
  });

  it('hides itself when iOS Safari reports navigator.standalone=true', () => {
    setUserAgent(IOS_UA);
    (navigator as Navigator & { standalone?: boolean }).standalone = true;
    render(<InstallPwaBanner appName='AdoptDS' />);

    expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
  });

  it('persists dismissal in localStorage and stays hidden across mounts', () => {
    const { unmount } = render(<InstallPwaBanner appName='AdoptDS' />);
    fireBeforeInstallPrompt();

    fireEvent.click(screen.getByTestId('pwa-install-banner-dismiss'));
    expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('ads:pwa-install-dismissed:AdoptDS')).not.toBeNull();

    unmount();

    render(<InstallPwaBanner appName='AdoptDS' />);
    fireBeforeInstallPrompt();
    expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
  });

  it('re-shows after the dismissal TTL has elapsed', () => {
    const past = Date.now() - 10 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem('ads:pwa-install-dismissed:AdoptDS', String(past));

    render(<InstallPwaBanner appName='AdoptDS' />);
    fireBeforeInstallPrompt();

    expect(screen.getByTestId('pwa-install-banner')).toBeInTheDocument();
  });

  it('respects a custom dismissTtlMs window', () => {
    window.localStorage.setItem('ads:pwa-install-dismissed:AdoptDS', String(Date.now() - 1000));

    render(<InstallPwaBanner appName='AdoptDS' dismissTtlMs={500} />);
    fireBeforeInstallPrompt();

    expect(screen.getByTestId('pwa-install-banner')).toBeInTheDocument();
  });

  it('hides itself when the appinstalled event fires', () => {
    render(<InstallPwaBanner appName='AdoptDS' />);
    fireBeforeInstallPrompt();
    expect(screen.getByTestId('pwa-install-banner')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(screen.queryByTestId('pwa-install-banner')).not.toBeInTheDocument();
  });

  it('uses the supplied storageKey when persisting dismissal', () => {
    render(<InstallPwaBanner appName='AdoptDS' storageKey='custom-key' />);
    fireBeforeInstallPrompt();
    fireEvent.click(screen.getByTestId('pwa-install-banner-dismiss'));

    expect(window.localStorage.getItem('custom-key')).not.toBeNull();
    expect(window.localStorage.getItem('ads:pwa-install-dismissed:AdoptDS')).toBeNull();
  });

  it('has dialog accessibility wiring', () => {
    render(<InstallPwaBanner appName='AdoptDS' />);
    fireBeforeInstallPrompt();

    const banner = screen.getByTestId('pwa-install-banner');
    expect(banner).toHaveAttribute('role', 'dialog');
    expect(banner).toHaveAttribute('aria-labelledby', 'pwa-install-banner-title');
    expect(banner).toHaveAttribute('aria-describedby', 'pwa-install-banner-description');
  });
});
