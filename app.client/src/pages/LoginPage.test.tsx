import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextType } from '@adopt-dont-shop/lib.auth';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';

import { LoginPage } from './LoginPage';

// ADS-627: provide a real AuthContext value so the LoginForm's internal
// `useAuth()` call resolves without needing to mock the whole module —
// `vi.mock` of `@adopt-dont-shop/lib.auth` would leak across files run
// in the same vitest worker and break sibling suites (App.test.tsx).
const authValue: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  refreshUser: vi.fn(),
};

const renderLoginPage = () =>
  render(
    <ThemeProvider>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </ThemeProvider>
  );

describe('LoginPage social sign-in', () => {
  it('renders Google and Apple sign-in buttons above the email form', () => {
    renderLoginPage();

    const googleButton = screen.getByRole('button', { name: /sign in with google/i });
    const appleButton = screen.getByRole('button', { name: /sign in with apple/i });
    // The lib.components `Input` is mocked in setup-tests.ts as a plain
    // <input> so labels aren't real DOM labels. Match on placeholder
    // text from the real LoginForm instead.
    const emailField = screen.getByPlaceholderText(/enter your email/i);

    expect(googleButton).toBeInTheDocument();
    expect(appleButton).toBeInTheDocument();

    // The social buttons must appear before the email input in the DOM
    expect(
      googleButton.compareDocumentPosition(emailField) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('shows a dev placeholder notice so the stub limitation is obvious', () => {
    renderLoginPage();

    expect(screen.getByText(/dev placeholder/i)).toBeInTheDocument();
  });

  it('surfaces a stub message when a provider button is clicked', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: /sign in with google/i }));

    expect(screen.getByText(/google sign-in is a dev placeholder/i)).toBeInTheDocument();
  });
});

/**
 * ADS-638: When a signed-out user lands on `/login?redirect=…`, the
 * LoginPage must send them back to that path on success — but only
 * if the path is safe (same-origin, no protocol-relative URLs).
 */
describe('LoginPage redirect query param', () => {
  const authenticatedAuthValue: AuthContextType = {
    user: {
      userId: 'u-1',
      email: 'user@example.com',
      firstName: 'A',
      lastName: 'B',
      userType: 'adopter',
      emailVerified: true,
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    refreshUser: vi.fn(),
  };

  const LocationProbe = () => {
    const location = useLocation();
    return (
      <div data-testid='probe'>
        {location.pathname}
        {location.search}
      </div>
    );
  };

  const renderWithEntry = (entry: string) =>
    render(
      <ThemeProvider>
        <AuthContext.Provider value={authenticatedAuthValue}>
          <MemoryRouter initialEntries={[entry]}>
            <Routes>
              <Route path='/login' element={<LoginPage />} />
              <Route path='*' element={<LocationProbe />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    );

  it('redirects an already-authenticated user to the safe redirect path', async () => {
    renderWithEntry('/login?redirect=/apply/pet-1');

    await waitFor(() => {
      expect(screen.getByTestId('probe').textContent).toBe('/apply/pet-1');
    });
  });

  it('preserves nested query strings on the redirect target', async () => {
    renderWithEntry(`/login?redirect=${encodeURIComponent('/pets/pet-1?action=contact')}`);

    await waitFor(() => {
      expect(screen.getByTestId('probe').textContent).toBe('/pets/pet-1?action=contact');
    });
  });

  it('ignores protocol-relative redirect targets to prevent open redirects', async () => {
    renderWithEntry('/login?redirect=//evil.com/steal');

    await waitFor(() => {
      expect(screen.getByTestId('probe').textContent).toBe('/');
    });
  });

  it('ignores absolute external URLs in the redirect param', async () => {
    renderWithEntry(`/login?redirect=${encodeURIComponent('https://evil.com/steal')}`);

    await waitFor(() => {
      expect(screen.getByTestId('probe').textContent).toBe('/');
    });
  });
});
