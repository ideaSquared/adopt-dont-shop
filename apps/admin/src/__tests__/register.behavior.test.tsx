/**
 * Behavioral tests for RegisterPage (Admin App)
 *
 * Tests admin-facing behavior:
 * - Page identifies itself as the admin access request form
 * - Footer provides a link to sign in for existing accounts
 * - Helper text explains admin account approval process
 * - Successful registration navigates to the dashboard
 */

import { vi, describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../test-utils';
import userEvent from '@testing-library/user-event';
import { RegisterPage } from '../pages/RegisterPage';

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
      {subtitle && <p>{subtitle}</p>}
      <div>{children}</div>
      {footer && <div>{footer}</div>}
    </div>
  ),
  RegisterForm: ({
    onSuccess,
    helperText,
  }: {
    onSuccess: () => void;
    requirePhoneNumber?: boolean;
    termsUrl?: string;
    privacyUrl?: string;
    helperText?: React.ReactNode;
  }) => (
    <div>
      <button onClick={onSuccess}>Create Account</button>
      {helperText && <div data-testid='helper-text'>{helperText}</div>}
    </div>
  ),
  useAuth: vi.fn(() => ({ isAuthenticated: false, isLoading: false, user: null })),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Register page', () => {
  describe('page identity', () => {
    it('identifies itself as the admin access request form', () => {
      renderWithProviders(<RegisterPage />);
      expect(screen.getByText('Request Admin Access')).toBeInTheDocument();
    });

    it('shows the correct subtitle', () => {
      renderWithProviders(<RegisterPage />);
      expect(screen.getByText('Create administrator account')).toBeInTheDocument();
    });
  });

  describe('existing user prompt', () => {
    it('asks if the visitor already has an account', () => {
      renderWithProviders(<RegisterPage />);
      expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    });

    it('provides a link to the sign-in page', () => {
      renderWithProviders(<RegisterPage />);
      const link = screen.getByRole('link', { name: /sign in/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/login');
    });
  });

  describe('approval process guidance', () => {
    it('explains that admin accounts require administrator approval', () => {
      renderWithProviders(<RegisterPage />);
      expect(screen.getByText(/admin accounts require approval/i)).toBeInTheDocument();
    });

    it('mentions that applicants will be notified once activated', () => {
      renderWithProviders(<RegisterPage />);
      expect(screen.getByText(/notified once.*activated/i)).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('navigates to home after successful registration', async () => {
      const user = userEvent.setup();
      mockNavigate.mockClear();

      renderWithProviders(<RegisterPage />);
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });
});
