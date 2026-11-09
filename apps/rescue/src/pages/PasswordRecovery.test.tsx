import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';

vi.mock('@adopt-dont-shop/lib.auth', async importOriginal => ({
  useOneTimeUrlToken: (await importOriginal<typeof import('@adopt-dont-shop/lib.auth')>())
    .useOneTimeUrlToken,
  AuthLayout: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
  ForgotPasswordForm: ({ loginHref }: { loginHref: string }) => <p>forgot form → {loginHref}</p>,
  ResetPasswordForm: ({ token, loginHref }: { token: string | null; loginHref: string }) => (
    <p>
      reset form token={String(token)} → {loginHref}
    </p>
  ),
}));

import { ForgotPasswordPage } from './ForgotPasswordPage';
import { ResetPasswordPage } from './ResetPasswordPage';

const LocationProbe = () => <p>search={useLocation().search}</p>;

describe('rescue password recovery pages', () => {
  it('offers the shared forgot-password form, returning to this app’s sign-in', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument();
    expect(screen.getByText('forgot form → /login')).toBeInTheDocument();
  });

  it('hands the emailed token to the reset form and strips it from the URL (ADS-1012)', async () => {
    render(
      <MemoryRouter initialEntries={['/reset-password?token=tok-1']}>
        <ResetPasswordPage />
        <LocationProbe />
      </MemoryRouter>
    );

    expect(screen.getByText('reset form token=tok-1 → /login')).toBeInTheDocument();
    expect(await screen.findByText('search=')).toBeInTheDocument();
  });
});
