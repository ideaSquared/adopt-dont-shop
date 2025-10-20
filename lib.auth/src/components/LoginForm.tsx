import React, { useState } from 'react';
import { Alert, Button, Input } from '@adopt-dont-shop/components';
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
  color: ${props => props.theme?.text?.secondary || '#6b7280'};
  margin-top: 0.5rem;
  display: block;
  font-size: 0.875rem;
  line-height: 1.4;

  strong {
    color: ${props => props.theme?.text?.primary || '#374151'};
  }
`;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate form data
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    try {
      await login(formData);
      onSuccess?.();
    } catch (err: unknown) {
      console.error('Login error:', err);
      const error = err as Error & { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message ||
          error.message ||
          'Login failed. Please check your credentials and try again.'
      );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <>
      {error && <StyledAlert variant='error'>{error}</StyledAlert>}

      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Input
            label='Email Address'
            type='email'
            name='email'
            placeholder='Enter your email'
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
            required
          />
        </FormGroup>

        <FormGroup>
          <Input
            label='Password'
            type='password'
            name='password'
            placeholder='Enter your password'
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            required
          />
          {showForgotPassword && onForgotPassword && (
            <a
              href='#'
              onClick={e => {
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

        <Button type='submit' size='lg' variant='primary' disabled={isLoading} style={{ width: '100%' }}>
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>

        {helperText && <HelperText>{helperText}</HelperText>}
      </Form>
    </>
  );
};
