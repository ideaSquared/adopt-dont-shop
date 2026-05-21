import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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
