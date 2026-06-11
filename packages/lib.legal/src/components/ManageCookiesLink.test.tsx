import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ManageCookiesLink } from './ManageCookiesLink';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  type StoredCookieConsent,
} from '../services/cookie-consent-storage';

const seedConsent = (record: StoredCookieConsent) => {
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
};

describe('ManageCookiesLink', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a button labelled "Manage cookies"', () => {
    render(<ManageCookiesLink />);
    expect(screen.getByRole('button', { name: 'Manage cookies' })).toBeInTheDocument();
  });

  it('clears the stored consent record when clicked', async () => {
    seedConsent({
      cookiesVersion: '2026-05-09-v1',
      analyticsConsent: true,
      acceptedAt: new Date().toISOString(),
    });
    render(<ManageCookiesLink />);

    await userEvent.click(screen.getByRole('button', { name: 'Manage cookies' }));

    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
  });

  it('dispatches the legal-consent-v1:cleared event when clicked', async () => {
    const handler = vi.fn();
    window.addEventListener('legal-consent-v1:cleared', handler);

    render(<ManageCookiesLink />);
    await userEvent.click(screen.getByRole('button', { name: 'Manage cookies' }));

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('legal-consent-v1:cleared', handler);
  });

  it('forwards an additional className to the rendered button', () => {
    render(<ManageCookiesLink className='my-footer-link' />);
    expect(screen.getByRole('button', { name: 'Manage cookies' })).toHaveClass('my-footer-link');
  });
});
