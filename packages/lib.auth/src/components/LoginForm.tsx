import React, { useState } from 'react';
import { Alert, Button, Input } from '@adopt-dont-shop/lib.components';
import { LoginRequestSchema } from '@adopt-dont-shop/lib.validation';
import { useAuth } from '../hooks/useAuth';
import {
  TWO_FACTOR_REQUIRED_MESSAGE,
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
  authService,
} from '../services/auth-service';
import { LoginRequest } from '../types';
import * as styles from './LoginForm.css';

// Canonical schema lives in @adopt-dont-shop/lib.validation. Pick the
// fields this form actually owns — the 2FA token is collected
// separately and submitted only after the back-end demands it.
const loginSchema = LoginRequestSchema.pick({ email: true, password: true });

export interface LoginFormProps {
  /**
   * Callback fired on successful login
   */
  onSuccess?: () => void;
  /**
   * Optional helper text to display below the form (e.g., app-specific instructions)
   */
  helperText?: React.ReactNode;
  /**
   * Show forgot password link
   */
  showForgotPassword?: boolean;
  /**
   * Callback for forgot password link
   */
  onForgotPassword?: () => void;
}

/**
 * Shared login form component
 * Handles validation, error states, and authentication
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  helperText,
  showForgotPassword = true,
  onForgotPassword,
}) => {
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [needs2FA, setNeeds2FA] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate form data
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    const credentials: LoginRequest = needs2FA ? { ...formData, twoFactorToken } : formData;

    try {
      await login(credentials);
      onSuccess?.();
    } catch (err: unknown) {
      console.error('Login error:', err);
      const error = err as Error & { response?: { data?: { message?: string; error?: string } } };
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Login failed. Please check your credentials and try again.';

      if (errorMessage.includes(TWO_FACTOR_REQUIRED_MESSAGE)) {
        setNeeds2FA(true);
        setError(null);
        return;
      }

      if (errorMessage.includes(EMAIL_VERIFICATION_REQUIRED_MESSAGE)) {
        setNeedsEmailVerification(true);
        setResendStatus('idle');
        setError(null);
        return;
      }

      setError(errorMessage);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleBack = () => {
    setNeeds2FA(false);
    setTwoFactorToken('');
    setNeedsEmailVerification(false);
    setResendStatus('idle');
    setError(null);
  };

  const handleResendVerification = async () => {
    setResendStatus('sending');
    try {
      await authService.resendVerification(formData.email);
    } finally {
      // The gateway always responds with success to avoid leaking which
      // addresses have accounts, so we report "sent" regardless.
      setResendStatus('sent');
    }
  };

  return (
    <>
      {error && (
        <Alert variant="error" className={styles.styledAlert}>
          {error}
        </Alert>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        {needsEmailVerification ? (
          <div className={styles.twoFactorGroup}>
            <div className={styles.twoFactorLabel}>Please verify your email</div>
            <p className={styles.twoFactorDescription}>
              Your email address needs to be verified before you can sign in. Check your inbox for
              the verification link we sent you.
            </p>
            <Button
              type="button"
              size="md"
              variant="secondary"
              onClick={handleResendVerification}
              disabled={resendStatus === 'sending'}
            >
              {resendStatus === 'sending'
                ? 'Sending...'
                : resendStatus === 'sent'
                  ? 'Verification email sent'
                  : 'Resend verification email'}
            </Button>
            <button className={styles.backLink} type="button" onClick={handleBack}>
              Back to login
            </button>
          </div>
        ) : !needs2FA ? (
          <>
            <div className={styles.formGroup}>
              <Input
                label="Email Address"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                error={fieldErrors.email}
                autoComplete="username"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <Input
                label="Password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                error={fieldErrors.password}
                autoComplete="current-password"
                required
              />
              {showForgotPassword && onForgotPassword && (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onForgotPassword();
                  }}
                  style={{
                    fontSize: '0.9rem',
                    color: '#667eea',
                    textDecoration: 'none',
                    textAlign: 'right',
                  }}
                >
                  Forgot your password?
                </a>
              )}
            </div>
          </>
        ) : (
          <div className={styles.twoFactorGroup}>
            <div className={styles.twoFactorLabel}>Two-Factor Authentication</div>
            <p className={styles.twoFactorDescription}>
              Enter the 6-digit code from your authenticator app, or a backup code.
            </p>
            <input
              className={styles.tokenInput}
              type="text"
              inputMode="numeric"
              maxLength={16}
              placeholder="000000"
              value={twoFactorToken}
              onChange={(e) => setTwoFactorToken(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
              autoComplete="one-time-code"
              autoFocus
            />
            <button className={styles.backLink} type="button" onClick={handleBack}>
              Back to login
            </button>
          </div>
        )}

        {!needsEmailVerification && (
          <Button
            type="submit"
            size="lg"
            variant="primary"
            disabled={
              isLoading ||
              (!needs2FA && (!formData.email || !formData.password)) ||
              (needs2FA && twoFactorToken.length < 6)
            }
            style={{ width: '100%' }}
          >
            {isLoading ? 'Signing In...' : needs2FA ? 'Verify' : 'Sign In'}
          </Button>
        )}

        {helperText && <small className={styles.helperText}>{helperText}</small>}
      </form>
    </>
  );
};
