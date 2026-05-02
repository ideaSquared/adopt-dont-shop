import React, { useState } from 'react';
import { Alert, Button, Input } from '@adopt-dont-shop/lib.components';
import { RegisterRequestSchema } from '@adopt-dont-shop/lib.validation';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { RegisterRequest } from '../types';
import * as styles from './RegisterForm.css';

// Canonical request schema lives in @adopt-dont-shop/lib.validation. The
// form layers on UI-only fields (confirmPassword, acceptTerms) that the
// backend doesn't see.
const registerSchema = RegisterRequestSchema.extend({
  confirmPassword: z.string(),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, 'You must accept the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
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
  const [formData, setFormData] = useState<
    RegisterRequest & { confirmPassword: string; acceptTerms: boolean }
  >({
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
  const allRequirementsMet = passwordRequirements.every((req) => req.valid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate form data
    const result = registerSchema.safeParse(formData);
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

    try {
      const { confirmPassword: _, acceptTerms: __, phoneNumber, ...rest } = formData;
      const registerData = {
        ...rest,
        ...(phoneNumber ? { phoneNumber } : {}),
      };
      await registerUser(registerData);
      onSuccess?.();
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const error = err as Error & { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || error.message || 'Registration failed. Please try again.'
      );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
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
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <Input
              label="First Name"
              name="firstName"
              placeholder="Enter your first name"
              value={formData.firstName}
              onChange={handleChange}
              error={fieldErrors.firstName}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <Input
              label="Last Name"
              name="lastName"
              placeholder="Enter your last name"
              value={formData.lastName}
              onChange={handleChange}
              error={fieldErrors.lastName}
              required
            />
          </div>
        </div>

        <div className={styles.formGroup}>
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
        </div>

        {requirePhoneNumber && (
          <div className={styles.formGroup}>
            <Input
              label="Phone Number"
              type="tel"
              name="phoneNumber"
              placeholder="(555) 123-4567"
              value={formData.phoneNumber}
              onChange={handleChange}
              error={fieldErrors.phoneNumber}
              required={requirePhoneNumber}
            />
          </div>
        )}

        <div className={styles.formGroup}>
          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            variant={allRequirementsMet ? 'success' : 'default'}
            required
          />
          {formData.password && !allRequirementsMet && (
            <div className={styles.passwordRequirements}>
              <div>Password requirements:</div>
              <ul className={styles.passwordRequirementsList}>
                {passwordRequirements.map((req, index) => (
                  <li
                    key={index}
                    className={`${styles.requirementItem} ${req.valid ? styles.requirementItemValid : styles.requirementItemInvalid}`}
                  >
                    <span
                      className={`${styles.checkIcon} ${req.valid ? styles.checkIconValid : styles.checkIconInvalid}`}
                    >
                      {req.valid && '✓'}
                    </span>
                    {req.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            required
          />
        </div>

        <div className={styles.termsCheckbox}>
          <input
            type="checkbox"
            id="acceptTerms"
            name="acceptTerms"
            checked={formData.acceptTerms}
            onChange={handleChange}
          />
          <label className={styles.termsCheckboxLabel} htmlFor="acceptTerms">
            I agree to the{' '}
            <a href={termsUrl} target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href={privacyUrl} target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
          </label>
        </div>
        {fieldErrors.acceptTerms && (
          <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '-0.5rem' }}>
            {fieldErrors.acceptTerms}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          variant="primary"
          disabled={isLoading}
          style={{ width: '100%' }}
        >
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
      </form>
    </>
  );
};
