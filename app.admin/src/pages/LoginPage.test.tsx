import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

// Mock the lib-auth module
jest.mock('@adopt-dont-shop/lib-auth', () => ({
  AuthLayout: ({ children, title, subtitle, footer }: {
    children: React.ReactNode;
    title: string;
    subtitle: string;
    footer: React.ReactNode;
  }) => (
    <div data-testid="auth-layout">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div>{children}</div>
      <div>{footer}</div>
    </div>
  ),
  LoginForm: ({ onSuccess, showForgotPassword, onForgotPassword, helperText }: {
    onSuccess: () => void;
    showForgotPassword: boolean;
    onForgotPassword: () => void;
    helperText: React.ReactNode;
  }) => (
    <div data-testid="login-form">
      <input
        type="email"
        placeholder="Email"
        data-testid="email-input"
      />
      <input
        type="password"
        placeholder="Password"
        data-testid="password-input"
      />
      <button
        type="button"
        data-testid="login-button"
        onClick={onSuccess}
      >
        Log In
      </button>
      {showForgotPassword && (
        <button
          type="button"
          data-testid="forgot-password-button"
          onClick={onForgotPassword}
        >
          Forgot Password?
        </button>
      )}
      {helperText && <div data-testid="helper-text">{helperText}</div>}
    </div>
  ),
}));

// Mock react-router-dom navigation hooks
const mockNavigate = jest.fn();
const mockLocation = { state: { from: { pathname: '/' } } };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
};

describe('LoginPage - Authentication Behaviours', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Display', () => {
    it('admin sees login page with correct title and subtitle', () => {
      renderLoginPage();

      expect(screen.getByText('Admin Portal')).toBeInTheDocument();
      expect(screen.getByText('System administration and management')).toBeInTheDocument();
    });

    it('admin sees login form with email and password inputs', () => {
      renderLoginPage();

      expect(screen.getByTestId('login-form')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });

    it('admin sees helper text explaining this is for administrators only', () => {
      renderLoginPage();

      const helperText = screen.getByTestId('helper-text');
      expect(helperText).toHaveTextContent('Administrators Only');
      expect(helperText).toHaveTextContent('Pet adopters should use the Client App');
      expect(helperText).toHaveTextContent('Rescue staff should use the Rescue App');
    });

    it('admin sees forgot password functionality is available', () => {
      renderLoginPage();

      expect(screen.getByTestId('forgot-password-button')).toBeInTheDocument();
    });

    it('admin sees link to request access/registration', () => {
      renderLoginPage();

      expect(screen.getByText('Need an admin account?')).toBeInTheDocument();
      expect(screen.getByText('Request access')).toBeInTheDocument();
      expect(screen.getByText('Request access')).toHaveAttribute('href', '/register');
    });
  });

  describe('Navigation Behaviours', () => {
    it('admin is redirected to dashboard after successful login', async () => {
      renderLoginPage();

      const loginButton = screen.getByTestId('login-button');
      await userEvent.click(loginButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });

    it('admin is redirected to original destination after login if coming from protected route', async () => {
      const customLocation = { state: { from: { pathname: '/users' } } };
      jest.spyOn(require('react-router-dom'), 'useLocation').mockReturnValue(customLocation);

      renderLoginPage();

      const loginButton = screen.getByTestId('login-button');
      await userEvent.click(loginButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/users', { replace: true });
      });
    });

    it('admin can navigate to forgot password page', async () => {
      renderLoginPage();

      const forgotPasswordButton = screen.getByTestId('forgot-password-button');
      await userEvent.click(forgotPasswordButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
      });
    });

    it('admin can navigate to registration page', () => {
      renderLoginPage();

      const registerLink = screen.getByText('Request access');
      expect(registerLink).toHaveAttribute('href', '/register');
    });
  });

  describe('Accessibility', () => {
    it('login page has proper semantic structure', () => {
      renderLoginPage();

      expect(screen.getByTestId('auth-layout')).toBeInTheDocument();
      expect(screen.getByTestId('login-form')).toBeInTheDocument();
    });

    it('login form inputs are accessible', () => {
      renderLoginPage();

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });
});
