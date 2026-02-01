import React, { useState } from 'react';
import { Alert, Button, Input } from '@adopt-dont-shop/lib.components';
import styled from 'styled-components';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { LoginRequest } from '../types';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StyledAlert = styled(Alert)`
  margin-bottom: 1rem;
`;

const HelperText = styled.small`
  color: ${(props) => props.theme?.text?.secondary || '#6b7280'};
  margin-top: 0.5rem;
  display: block;
  font-size: 0.875rem;
  line-height: 1.4;

  strong {
    color: ${(props) => props.theme?.text?.primary || '#374151'};
  }
`;

const TwoFactorGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: ${(props) => props.theme?.background?.secondary || '#f9fafb'};
  border: 1px solid ${(props) => props.theme?.border?.color?.primary || '#e5e7eb'};
  border-radius: 8px;
`;

const TwoFactorLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${(props) => props.theme?.text?.primary || '#374151'};
`;

const TwoFactorDescription = styled.p`
  font-size: 0.8rem;
  color: ${(props) => props.theme?.text?.secondary || '#6b7280'};
  margin: 0;
`;

const TokenInput = styled.input`
  padding: 0.75rem;
  border: 1px solid ${(props) => props.theme?.border?.color?.primary || '#e5e7eb'};
  border-radius: 6px;
  font-size: 1.25rem;
  letter-spacing: 0.3em;
  text-align: center;
  max-width: 200px;
  background: ${(props) => props.theme?.background?.primary || '#ffffff'};
  color: ${(props) => props.theme?.text?.primary || '#111827'};

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme?.colors?.primary?.[500] || '#2563eb'};
    box-shadow: 0 0 0 2px ${(props) => props.theme?.colors?.primary?.[100] || '#dbeafe'};
  }
`;

const BackLink = styled.button`
  background: none;
  border: none;
  color: ${(props) => props.theme?.colors?.primary?.[500] || '#2563eb'};
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0;
  text-align: left;

  &:hover {
    text-decoration: underline;
  }
`;

const TWO_FACTOR_REQUIRED_MESSAGE = 'Two-factor authentication code required';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate form data
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    const credentials: LoginRequest = needs2FA
      ? { ...formData, twoFactorToken }
      : formData;

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
    setError(null);
  };

  return (
    <>
      {error && <StyledAlert variant="error">{error}</StyledAlert>}

      <Form onSubmit={handleSubmit}>
        {!needs2FA ? (
          <>
            <FormGroup>
              <Input
                label="Email Address"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                error={fieldErrors.email}
                required
              />
            </FormGroup>

            <FormGroup>
              <Input
                label="Password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                error={fieldErrors.password}
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
            </FormGroup>
          </>
        ) : (
          <TwoFactorGroup>
            <TwoFactorLabel>Two-Factor Authentication</TwoFactorLabel>
            <TwoFactorDescription>
              Enter the 6-digit code from your authenticator app, or a backup code.
            </TwoFactorDescription>
            <TokenInput
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder="000000"
              value={twoFactorToken}
              onChange={(e) => setTwoFactorToken(e.target.value.replace(/[^a-fA-F0-9]/g, ''))}
              autoFocus
            />
            <BackLink type="button" onClick={handleBack}>
              Back to login
            </BackLink>
          </TwoFactorGroup>
        )}

        <Button
          type="submit"
          size="lg"
          variant="primary"
          disabled={isLoading || (needs2FA && twoFactorToken.length < 6)}
          style={{ width: '100%' }}
        >
          {isLoading ? 'Signing In...' : needs2FA ? 'Verify' : 'Sign In'}
        </Button>

        {helperText && <HelperText>{helperText}</HelperText>}
      </Form>
    </>
  );
};
