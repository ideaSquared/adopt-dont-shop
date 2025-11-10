/**
 * Authentication Behaviour Tests
 *
 * These tests verify user authentication behaviours including:
 * - Login with valid/invalid credentials
 * - User registration
 * - Password reset flows
 * - Session management
 *
 * All tests use MSW to mock API responses - no real API calls.
 */

import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../test-utils/test-helpers';
import { resetMockData } from '../test-utils/msw-handlers';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';

describe('User Authentication Behaviours', () => {
  beforeEach(() => {
    resetMockData();
  });

  describe('User Login', () => {
    it('allows user to log in with valid credentials', async () => {
      const user = userEvent.setup();

      renderWithProviders(<LoginPage />);

      // User sees the login form
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();

      // User enters valid credentials
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // User submits the form
      const submitButton = screen.getByRole('button', { name: /sign in|log in/i });
      await user.click(submitButton);

      // System validates and logs user in
      // User is redirected (location change will happen in actual app)
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('prevents login with invalid credentials and shows error message', async () => {
      const user = userEvent.setup();

      renderWithProviders(<LoginPage />);

      // User enters invalid credentials
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');

      // User submits the form
      const submitButton = screen.getByRole('button', { name: /sign in|log in/i });
      await user.click(submitButton);

      // System shows error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials|incorrect email or password/i)).toBeInTheDocument();
      });

      // User remains on login page
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    });

    it('allows user to toggle password visibility', async () => {
      const user = userEvent.setup();

      renderWithProviders(<LoginPage />);

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

      // Initially password is hidden
      expect(passwordInput.type).toBe('password');

      // User clicks show password toggle
      const toggleButton = screen.getByRole('button', { name: /show password|toggle password/i });
      await user.click(toggleButton);

      // Password becomes visible
      expect(passwordInput.type).toBe('text');

      // User clicks again to hide
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });

    it('allows user to navigate to forgot password page', async () => {
      const user = userEvent.setup();

      renderWithProviders(<LoginPage />);

      // User clicks forgot password link
      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      await user.click(forgotPasswordLink);

      // Navigation will happen in actual app with router
      // In test, we verify the link exists and is clickable
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
    });

    it('shows validation errors for empty fields', async () => {
      const user = userEvent.setup();

      renderWithProviders(<LoginPage />);

      // User tries to submit without filling fields
      const submitButton = screen.getByRole('button', { name: /sign in|log in/i });
      await user.click(submitButton);

      // System shows validation errors
      await waitFor(() => {
        expect(screen.getByText(/email is required|this field is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Registration', () => {
    it('allows user to register a new account with valid information', async () => {
      const user = userEvent.setup();

      renderWithProviders(<RegisterPage />);

      // User sees registration form
      expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();

      // User fills out registration form
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
      await user.type(screen.getAllByLabelText(/password/i)[0], 'SecurePass123!');

      // User submits the form
      const submitButton = screen.getByRole('button', { name: /sign up|create account|register/i });
      await user.click(submitButton);

      // System creates account and redirects user
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('prevents registration with existing email', async () => {
      const user = userEvent.setup();

      renderWithProviders(<RegisterPage />);

      // User enters email that already exists
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getAllByLabelText(/password/i)[0], 'SecurePass123!');

      // User submits the form
      const submitButton = screen.getByRole('button', { name: /sign up|create account|register/i });
      await user.click(submitButton);

      // System shows error message
      await waitFor(() => {
        expect(screen.getByText(/email already exists|email is already registered/i)).toBeInTheDocument();
      });

      // User remains on registration page
      expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    });

    it('shows validation errors for invalid password', async () => {
      const user = userEvent.setup();

      renderWithProviders(<RegisterPage />);

      // User enters weak password
      await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
      await user.type(screen.getAllByLabelText(/password/i)[0], '123');

      // User moves to next field
      await user.tab();

      // System shows password requirements
      await waitFor(() => {
        expect(
          screen.getByText(/password must be|password requirements|at least 8 characters/i)
        ).toBeInTheDocument();
      });
    });

    it('allows user to navigate to login page from registration', async () => {
      const user = userEvent.setup();

      renderWithProviders(<RegisterPage />);

      // User sees link to login page
      const loginLink = screen.getByRole('link', { name: /sign in|already have an account/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Password Reset', () => {
    it('allows user to request password reset', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ForgotPasswordPage />);

      // User sees forgot password form
      expect(screen.getByRole('heading', { name: /forgot password|reset password/i })).toBeInTheDocument();

      // User enters email
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      // User submits request
      const submitButton = screen.getByRole('button', { name: /send reset link|reset password/i });
      await user.click(submitButton);

      // System sends reset email and shows confirmation
      await waitFor(() => {
        expect(
          screen.getByText(/reset email sent|check your email|sent instructions/i)
        ).toBeInTheDocument();
      });
    });

    it('allows user to reset password with valid token', async () => {
      const user = userEvent.setup();

      // Simulate user arriving with reset token in URL
      renderWithProviders(<ResetPasswordPage />, {
        initialRoute: '/reset-password?token=valid-token',
      });

      // User sees reset password form
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      // User enters new password
      await user.type(newPasswordInput, 'NewSecurePass123!');
      await user.type(confirmPasswordInput, 'NewSecurePass123!');

      // User submits form
      const submitButton = screen.getByRole('button', { name: /reset password|update password/i });
      await user.click(submitButton);

      // System updates password and shows success message
      await waitFor(() => {
        expect(screen.getByText(/password reset successful|password updated/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid or expired reset token', async () => {
      const user = userEvent.setup();

      // Simulate user arriving with invalid token
      renderWithProviders(<ResetPasswordPage />, {
        initialRoute: '/reset-password?token=invalid-token',
      });

      // User enters new password
      await user.type(screen.getByLabelText(/new password/i), 'NewSecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'NewSecurePass123!');

      // User submits form
      const submitButton = screen.getByRole('button', { name: /reset password|update password/i });
      await user.click(submitButton);

      // System shows error message
      await waitFor(() => {
        expect(
          screen.getByText(/invalid token|expired token|link has expired/i)
        ).toBeInTheDocument();
      });
    });

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ResetPasswordPage />, {
        initialRoute: '/reset-password?token=valid-token',
      });

      // User enters mismatched passwords
      await user.type(screen.getByLabelText(/new password/i), 'NewSecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123!');

      // User submits form
      const submitButton = screen.getByRole('button', { name: /reset password|update password/i });
      await user.click(submitButton);

      // System shows validation error
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match|passwords must match/i)).toBeInTheDocument();
      });
    });
  });
});
