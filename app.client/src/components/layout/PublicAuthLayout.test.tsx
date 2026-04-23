import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '@adopt-dont-shop/lib.components';
import { PublicAuthLayout } from './PublicAuthLayout';

const renderAt = (path: string) =>
  render(
    <ThemeProvider theme={lightTheme}>
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
});
