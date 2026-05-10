import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { COOKIE_CONSENT_STORAGE_KEY } from '@adopt-dont-shop/lib.legal';
import { AdminLayout } from './AdminLayout';

// AdminSidebar / AdminHeader pull in heavy auth + nav deps that aren't
// relevant to the footer behaviour under test. Stub them.
vi.mock('./AdminSidebar', () => ({
  AdminSidebar: () => <aside data-testid='admin-sidebar' />,
}));
vi.mock('./AdminHeader', () => ({
  AdminHeader: () => <header data-testid='admin-header' />,
}));

const renderLayout = () =>
  render(
    <MemoryRouter>
      <AdminLayout>
        <div>page-content</div>
      </AdminLayout>
    </MemoryRouter>
  );

describe('AdminLayout [ADS-497 slice 5b]', () => {
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
