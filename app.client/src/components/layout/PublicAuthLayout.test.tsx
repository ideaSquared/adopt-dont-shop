import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeProvider } from '@adopt-dont-shop/lib.components';
import { COOKIE_CONSENT_STORAGE_KEY } from '@adopt-dont-shop/lib.legal';
import { PublicAuthLayout } from './PublicAuthLayout';

const renderAt = (path: string) =>
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<PublicAuthLayout />}>
            <Route path='/login' element={<div>Login page content</div>} />
            <Route path='/register' element={<div>Register page content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );

describe('PublicAuthLayout', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the logo linking back to home', () => {
    renderAt('/login');
    expect(screen.getByRole('link', { name: /adopt don't shop/i })).toHaveAttribute('href', '/');
  });

  it('shows a "Sign up" switch link on the /login route', () => {
    renderAt('/login');
    const switchLink = screen.getByRole('link', { name: /sign up/i });
    expect(switchLink).toHaveAttribute('href', '/register');
  });

  it('shows a "Log in" switch link on the /register route', () => {
    renderAt('/register');
    const switchLink = screen.getByRole('link', { name: /log in/i });
    expect(switchLink).toHaveAttribute('href', '/login');
  });

  it('renders the nested route content', () => {
    renderAt('/login');
    expect(screen.getByText('Login page content')).toBeInTheDocument();
  });

  it('clears the stored consent record when the footer "Manage cookies" link is clicked', async () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({
        cookiesVersion: '2026-05-09-v1',
        analyticsConsent: true,
        acceptedAt: '2026-05-10T00:00:00.000Z',
      })
    );

    renderAt('/login');

    await userEvent.click(screen.getByRole('button', { name: 'Manage cookies' }));

    expect(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)).toBeNull();
  });
});
