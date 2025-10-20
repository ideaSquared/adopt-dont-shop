import React, { useState } from 'react';
import { Alert, Button, Input } from '@adopt-dont-shop/components';
import styled from 'styled-components';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { RegisterRequest } from '../types';

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StyledAlert = styled(Alert)`
  margin-bottom: 1rem;
`;

const PasswordRequirements = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme?.text?.secondary || '#6b7280'};
  margin-top: 0.5rem;

  ul {
    margin: 0.5rem 0 0 1rem;
    padding: 0;
    list-style: none;
  }

  li {
    margin-bottom: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: color 0.2s ease;

    .check-icon {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      transition: all 0.2s ease;
    }

    &.valid {
      color: #10b981;

      .check-icon {
        background-color: #10b981;
        color: white;
      }
    }

    &.invalid {
      color: #ef4444;

      .check-icon {
        background-color: #e5e7eb;
        color: #9ca3af;
      }
    }
  }
`;

const TermsCheckbox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin: 1rem 0;

  input[type='checkbox'] {
    margin-top: 0.25rem;
  }

  label {
    font-size: 0.9rem;
    color: ${props => props.theme?.text?.secondary || '#6b7280'};
    line-height: 1.4;

    a {
      color: #667eea;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
    email: z.string().email('Please enter a valid email address'),
    phoneNumber: z.string().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export interface RegisterFormProps {
  /**
   * Callback fired on successful registration
   */
  onSuccess?: () => void;
  /**
   * Optional helper text to display below the form (e.g., app-specific instructions)
   */
  helperText?: React.ReactNode;
  /**
   * Show phone number field (optional for most apps, required for rescue app)
   */
  requirePhoneNumber?: boolean;
  /**
   * URLs for terms and privacy policy
   */
  termsUrl?: string;
  privacyUrl?: string;
}

/**
 * Shared registration form component
 * Handles validation, password requirements, and user creation
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  helperText,
  requirePhoneNumber = false,
  termsUrl = '/terms',
  privacyUrl = '/privacy',
}) => {
  const { register: registerUser, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<RegisterRequest & { confirmPassword: string; acceptTerms: boolean }>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    acceptTerms: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const getPasswordRequirements = () => {
    return [
      { text: 'At least 8 characters', valid: formData.password.length >= 8 },
      { text: 'One lowercase letter', valid: /[a-z]/.test(formData.password) },
      { text: 'One uppercase letter', valid: /[A-Z]/.test(formData.password) },
      { text: 'One number', valid: /[0-9]/.test(formData.password) },
      { text: 'One special character (@$!%*?&)', valid: /[@$!%*?&]/.test(formData.password) },
    ];
  };

  const passwordRequirements = getPasswordRequirements();
  const allRequirementsMet = passwordRequirements.every(req => req.valid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate form data
    const result = registerSchema.safeParse(formData);
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
      const { confirmPassword: _, acceptTerms: __, ...registerData } = formData;
      await registerUser(registerData);
      onSuccess?.();
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const error = err as Error & { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || error.message || 'Registration failed. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
        <FormRow>
          <FormGroup>
            <Input
              label='First Name'
              name='firstName'
              placeholder='Enter your first name'
              value={formData.firstName}
              onChange={handleChange}
              error={fieldErrors.firstName}
              required
            />
          </FormGroup>
          <FormGroup>
            <Input
              label='Last Name'
              name='lastName'
              placeholder='Enter your last name'
              value={formData.lastName}
              onChange={handleChange}
              error={fieldErrors.lastName}
              required
            />
          </FormGroup>
        </FormRow>

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

        {requirePhoneNumber && (
          <FormGroup>
            <Input
              label='Phone Number'
              type='tel'
              name='phoneNumber'
              placeholder='(555) 123-4567'
              value={formData.phoneNumber}
              onChange={handleChange}
              error={fieldErrors.phoneNumber}
              required={requirePhoneNumber}
            />
          </FormGroup>
        )}

        <FormGroup>
          <Input
            label='Password'
            type='password'
            name='password'
            placeholder='Create a strong password'
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            variant={allRequirementsMet ? 'success' : 'default'}
            required
          />
          {formData.password && !allRequirementsMet && (
            <PasswordRequirements>
              <div>Password requirements:</div>
              <ul>
                {passwordRequirements.map((req, index) => (
                  <li key={index} className={req.valid ? 'valid' : 'invalid'}>
                    <span className='check-icon'>{req.valid && '✓'}</span>
                    {req.text}
                  </li>
                ))}
              </ul>
            </PasswordRequirements>
          )}
        </FormGroup>

        <FormGroup>
          <Input
            label='Confirm Password'
            type='password'
            name='confirmPassword'
            placeholder='Confirm your password'
            value={formData.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            required
          />
        </FormGroup>

        <TermsCheckbox>
          <input
            type='checkbox'
            id='acceptTerms'
            name='acceptTerms'
            checked={formData.acceptTerms}
            onChange={handleChange}
          />
          <label htmlFor='acceptTerms'>
            I agree to the{' '}
            <a href={termsUrl} target='_blank' rel='noopener noreferrer'>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href={privacyUrl} target='_blank' rel='noopener noreferrer'>
              Privacy Policy
            </a>
          </label>
        </TermsCheckbox>
        {fieldErrors.acceptTerms && (
          <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '-0.5rem' }}>
            {fieldErrors.acceptTerms}
          </div>
        )}

        <Button type='submit' size='lg' variant='primary' disabled={isLoading} style={{ width: '100%' }}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>

        {helperText && (
          <small
            style={{
              color: '#6b7280',
              marginTop: '0.5rem',
              display: 'block',
              fontSize: '0.875rem',
              lineHeight: 1.4,
            }}
          >
            {helperText}
          </small>
        )}
      </Form>
    </>
  );
};
