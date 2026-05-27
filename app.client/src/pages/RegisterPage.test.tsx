import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextType } from '@adopt-dont-shop/lib.auth';
import { ThemeProvider } from '@adopt-dont-shop/lib.components';

import { RegisterPage } from './RegisterPage';

// ADS-627: provide a real AuthContext value so the RegisterForm's
// internal `useAuth()` call resolves without needing to mock the whole
// module — `vi.mock` of `@adopt-dont-shop/lib.auth` would leak across
// files run in the same vitest worker and break sibling suites
// (App.test.tsx).
const authValue: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  refreshUser: vi.fn(),
};

const renderRegisterPage = () =>
  render(
    <ThemeProvider>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/register']}>
          <RegisterPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </ThemeProvider>
  );

describe('RegisterPage social sign-in', () => {
  it('renders Google and Apple sign-up buttons above the email form', () => {
    renderRegisterPage();

    const googleButton = screen.getByRole('button', { name: /sign up with google/i });
    const appleButton = screen.getByRole('button', { name: /sign up with apple/i });
    // The lib.components `Input` is mocked in setup-tests.ts as a plain
    // <input> so labels aren't real DOM labels. Match on placeholder
    // text from the real RegisterForm instead.
    const firstNameField = screen.getByPlaceholderText(/enter your first name/i);

    expect(googleButton).toBeInTheDocument();
    expect(appleButton).toBeInTheDocument();

    // The social buttons must appear before the form fields in the DOM
    expect(
      googleButton.compareDocumentPosition(firstNameField) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('shows a dev placeholder notice so the stub limitation is obvious', () => {
    renderRegisterPage();

    expect(screen.getByText(/dev placeholder/i)).toBeInTheDocument();
  });
});
