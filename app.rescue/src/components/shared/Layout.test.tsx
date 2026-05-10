import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { COOKIE_CONSENT_STORAGE_KEY } from '@adopt-dont-shop/lib.legal';
import Layout from './Layout';

// Navigation pulls in auth/chat contexts that aren't relevant to the
// footer behaviour under test. Stub it.
vi.mock('./Navigation', () => ({
  default: () => <nav data-testid="rescue-navigation" />,
}));

const renderLayout = () =>
  render(
    <MemoryRouter>
      <Layout>
        <div>page-content</div>
      </Layout>
    </MemoryRouter>
  );

describe('Layout [ADS-497 slice 5b]', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders a "Manage cookies" footer link that clears the stored consent record on click', async () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({
        cookiesVersion: '2026-05-09-v1',
        analyticsConsent: true,
        acceptedAt: '2026-05-10T00:00:00.000Z',
      })
    );

    renderLayout();

    await userEvent.click(screen.getByRole('button', { name: 'Manage cookies' }));

    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
  });
});
