/**
 * Mock for @adopt-dont-shop/lib-auth with proper UI elements
 */

import { ReactNode, useState } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
};

export const AuthLayout = ({ children, title, subtitle, footer }: AuthLayoutProps) => (
  <div>
    <div>
      <h1>Adopt Don't Shop</h1>
      {title && <h2>{title}</h2>}
      {subtitle && <p>{subtitle}</p>}
    </div>
    {children}
    {footer}
  </div>
);

type LoginFormProps = {
  onSuccess?: () => void;
  showForgotPassword?: boolean;
  onForgotPassword?: () => void;
};

export const LoginForm = ({ onSuccess, showForgotPassword = true, onForgotPassword }: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email is required');
      return;
    }

    if (email === 'wrong@example.com' || password === 'wrongpassword') {
      setError('Invalid credentials');
      return;
    }

    onSuccess?.();
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    onForgotPassword?.();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? 'Hide password' : 'Show password'}
          </button>
        </div>
      </div>

      {error && <div role="alert">{error}</div>}

      <button type="submit">Log In</button>

      {showForgotPassword && (
        <a href="/forgot-password" onClick={handleForgotPassword}>
          Forgot Password?
        </a>
      )}
    </form>
  );
};

type RegisterFormProps = {
  onSuccess?: () => void;
  requirePhoneNumber?: boolean;
  termsUrl?: string;
  privacyUrl?: string;
};

export const RegisterForm = ({ onSuccess }: RegisterFormProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value.length > 0 && value.length < 8) {
      setPasswordError('Password must be at least 8 characters');
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (email === 'existing@example.com') {
      setError('Email already exists');
      return;
    }

    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="firstName">First Name</label>
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="lastName">Last Name</label>
        <input
          id="lastName"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="reg-email">Email</label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="reg-password">Password</label>
        <input
          id="reg-password"
          type="password"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          onBlur={(e) => handlePasswordChange(e.target.value)}
        />
        {passwordError && <div>{passwordError}</div>}
      </div>

      {error && <div role="alert">{error}</div>}

      <button type="submit">Sign Up</button>
    </form>
  );
};

export const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div>
        <h2>Check Your Email</h2>
        <p>Password reset instructions have been sent</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="forgot-email">Email</label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit">Send Reset Link</button>
      </form>
    </div>
  );
};

export const ResetPasswordForm = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Simulate invalid token
  const token = new URLSearchParams(window.location.search).get('token');
  if (token === 'invalid-token') {
    return (
      <div>
        <h2>Reset Password</h2>
        <div role="alert">Invalid token</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div>
        <h2>Password Reset Successful</h2>
        <p>Your password has been reset</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Reset Password</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="new-password">New Password</label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label htmlFor="confirm-password">Confirm Password</label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && <div role="alert">{error}</div>}

        <button type="submit">Reset Password</button>
      </form>
    </div>
  );
};

export class AuthService {
  login = jest.fn(() => Promise.resolve({ token: 'mock-token', user: {} }));
  logout = jest.fn(() => Promise.resolve());
  register = jest.fn(() => Promise.resolve({ token: 'mock-token', user: {} }));
  forgotPassword = jest.fn(() => Promise.resolve());
  resetPassword = jest.fn(() => Promise.resolve());
  verifyToken = jest.fn(() => Promise.resolve(true));
  getCurrentUser = jest.fn(() => Promise.resolve(null));
}

export const useAuth = jest.fn(() => ({
  isAuthenticated: false,
  user: null,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
}));

export const authService = new AuthService();
