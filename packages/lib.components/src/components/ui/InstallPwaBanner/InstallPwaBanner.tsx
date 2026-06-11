import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

import * as styles from './InstallPwaBanner.css';

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
};

type StandaloneNavigator = Navigator & { standalone?: boolean };

const DEFAULT_STORAGE_KEY_PREFIX = 'ads:pwa-install-dismissed:';
const DEFAULT_DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type InstallPwaBannerProps = {
  appName: string;
  storageKey?: string;
  dismissTtlMs?: number;
  className?: string;
  'data-testid'?: string;
};

type InstallMode = 'chromium' | 'ios' | 'none';

const isIos = (): boolean =>
  typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  ) {
    return true;
  }
  return (navigator as StandaloneNavigator).standalone === true;
};

const wasRecentlyDismissed = (key: string, ttlMs: number): boolean => {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return false;
    }
    const dismissedAt = Number(stored);
    if (!Number.isFinite(dismissedAt)) {
      return false;
    }
    return Date.now() - dismissedAt < ttlMs;
  } catch {
    return false;
  }
};

export const InstallPwaBanner: React.FC<InstallPwaBannerProps> = ({
  appName,
  storageKey,
  dismissTtlMs = DEFAULT_DISMISS_TTL_MS,
  className,
  'data-testid': testId = 'pwa-install-banner',
}) => {
  const key = storageKey ?? `${DEFAULT_STORAGE_KEY_PREFIX}${appName}`;
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<InstallMode>('none');

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed(key, dismissTtlMs)) {
      return;
    }

    if (isIos()) {
      setMode('ios');
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setMode('chromium');
    };

    const onAppInstalled = () => {
      setMode('none');
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [key, dismissTtlMs]);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(key, String(Date.now()));
    } catch {
      // Storage may be unavailable (Safari private mode, quota). Hide anyway.
    }
    setMode('none');
    setDeferredPrompt(null);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setMode('none');
    setDeferredPrompt(null);
  };

  if (mode === 'none') {
    return null;
  }

  const titleId = `${testId}-title`;
  const descId = `${testId}-description`;

  return (
    <div
      className={clsx(styles.banner, className)}
      role='dialog'
      aria-labelledby={titleId}
      aria-describedby={descId}
      data-testid={testId}
    >
      <div className={styles.content}>
        <h2 id={titleId} className={styles.title}>
          Install {appName}
        </h2>
        <p id={descId} className={styles.description}>
          {mode === 'ios'
            ? `Tap the Share button, then "Add to Home Screen" to install ${appName}.`
            : `Install ${appName} for faster access and a full-screen experience.`}
        </p>
      </div>
      <div className={styles.actions}>
        {mode === 'chromium' && (
          <button
            type='button'
            className={styles.installButton}
            onClick={handleInstall}
            data-testid={`${testId}-install`}
          >
            Install
          </button>
        )}
        <button
          type='button'
          className={styles.dismissButton}
          onClick={handleDismiss}
          data-testid={`${testId}-dismiss`}
          aria-label='Dismiss install prompt'
        >
          Not now
        </button>
      </div>
    </div>
  );
};
