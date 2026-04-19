/**
 * Behavioral tests for LoginPage (Admin App)
 *
 * Tests admin-facing behavior:
 * - Page renders as the Admin Portal (not a generic login page)
 * - Page shows the correct subtitle for system administration
 * - Helper text clarifies this app is for admins only, not adopters/rescue staff
 * - Footer provides a link for requesting admin access
 * - Successful login navigates to the intended page
 * - Forgot password navigates to the forgot-password route
 */

import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../pages/LoginPage';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  AuthLayout: ({
    title,
    subtitle,
    children,
    footer,
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {subtitle && <p data-testid='subtitle'>{subtitle}</p>}
      <div data-testid='auth-content'>{children}</div>
      {footer && <div data-testid='auth-footer'>{footer}</div>}
    </div>
  ),
  LoginForm: ({
    onSuccess,
    showForgotPassword,
    onForgotPassword,
    helperText,
  }: {
    onSuccess: () => void;
    showForgotPassword?: boolean;
    onForgotPassword?: () => void;
    helperText?: React.ReactNode;
  }) => (
    <div>
      <button onClick={onSuccess}>Sign In</button>
      {showForgotPassword && onForgotPassword && (
        <button onClick={onForgotPassword}>Forgot Password</button>
      )}
      {helperText && <div data-testid='helper-text'>{helperText}</div>}
    </div>
  ),
  useAuth: vi.fn(() => ({ isAuthenticated: false, isLoading: false, user: null })),
}));

// Capture navigate calls to verify routing behaviour
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null, pathname: '/login' }),
  };
});

beforeAll(() => {
  mockNavigate.mockClear();
});

afterAll(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Login page', () => {
  describe('page identity', () => {
    it('identifies itself as the Admin Portal', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByText('Admin Portal')).toBeInTheDocument();
    });

    it('shows system administration as the subtitle', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByText('System administration and management')).toBeInTheDocument();
    });
  });

  describe('access request prompt', () => {
    it('asks if the visitor needs an admin account', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByText('Need an admin account?')).toBeInTheDocument();
    });

    it('provides a link to request admin access', () => {
      renderWithProviders(<LoginPage />);
      const link = screen.getByRole('link', { name: /request access/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/register');
    });
  });

  describe('audience guidance', () => {
    it('states this app is for administrators only', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByText(/administrators only/i)).toBeInTheDocument();
    });

    it('mentions the Client App for pet adopters', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByText(/client app/i)).toBeInTheDocument();
    });

    it('mentions the Rescue App for rescue staff', () => {
      renderWithProviders(<LoginPage />);
      expect(screen.getByText(/rescue app/i)).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('navigates to the home page after successful login', async () => {
      const user = userEvent.setup();
      mockNavigate.mockClear();

      renderWithProviders(<LoginPage />);
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('navigates to forgot-password when forgot password is clicked', async () => {
      const user = userEvent.setup();
      mockNavigate.mockClear();

      renderWithProviders(<LoginPage />);
      await user.click(screen.getByRole('button', { name: /forgot password/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
    });
  });
});
