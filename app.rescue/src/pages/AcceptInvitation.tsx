import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { invitationService } from '../services/libraryServices';
import * as styles from './AcceptInvitation.css';

interface AcceptInvitationFormData {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  title?: string;
}

const AcceptInvitation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState<string>('');

  const [formData, setFormData] = useState<AcceptInvitationFormData>({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    title: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (!token) {
        setError('Invalid invitation link. No token provided.');
        setLoading(false);
        return;
      }

      try {
        const details = await invitationService.getInvitationDetails(token);
        if (details) {
          setInvitationEmail(details.email);
        } else {
          setError('Invitation not found or has expired.');
        }
      } catch (err) {
        setError('Failed to load invitation details. The link may be invalid or expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitationDetails();
  }, [token]);

  const handleInputChange = (field: keyof AcceptInvitationFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.title && formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !token) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await invitationService.acceptInvitation({
        token,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
        title: formData.title,
      });

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to accept invitation. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h1>Accept Invitation</h1>
            <p>Loading invitation details...</p>
          </div>
          <div className={styles.loadingContainer}>
            <span className={styles.loadingSpinner} />
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h1>Welcome!</h1>
            <p>Your account has been created successfully</p>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.successContainer}>
              <div className={styles.successIcon}>🎉</div>
              <h2>Account Created!</h2>
              <p>
                Your account has been successfully created. You can now log in to start working with
                your rescue team.
              </p>
              <button className={styles.loginButton} onClick={handleGoToLogin}>
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invitationEmail) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h1>Invalid Invitation</h1>
            <p>Unable to process invitation</p>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.errorContainer}>
              <h3>⚠️ Error</h3>
              <p>{error}</p>
            </div>
            <button
              className={clsx(styles.loginButton, styles.loginButtonFull)}
              onClick={handleGoToLogin}
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h1>Join the Team!</h1>
          <p>Create your account to get started</p>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.invitationInfo}>
            <p>
              <strong>You've been invited to join a rescue organization</strong>
              You're registering with: {invitationEmail}
            </p>
          </div>

          {error && (
            <div className={styles.errorContainer}>
              <h3>⚠️ Error</h3>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="firstName">
                First Name <span className={styles.requiredIndicator}>*</span>
              </label>
              <input
                id="firstName"
                type="text"
                className={clsx(styles.formInput, errors.firstName && styles.formInputError)}
                value={formData.firstName}
                onChange={e => handleInputChange('firstName', e.target.value)}
                placeholder="Enter your first name"
                disabled={submitting}
                required
                autoFocus
              />
              {errors.firstName && <span className={styles.formError}>{errors.firstName}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="lastName">
                Last Name <span className={styles.requiredIndicator}>*</span>
              </label>
              <input
                id="lastName"
                type="text"
                className={clsx(styles.formInput, errors.lastName && styles.formInputError)}
                value={formData.lastName}
                onChange={e => handleInputChange('lastName', e.target.value)}
                placeholder="Enter your last name"
                disabled={submitting}
                required
              />
              {errors.lastName && <span className={styles.formError}>{errors.lastName}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="password">
                Password <span className={styles.requiredIndicator}>*</span>
              </label>
              <input
                id="password"
                type="password"
                className={clsx(styles.formInput, errors.password && styles.formInputError)}
                value={formData.password}
                onChange={e => handleInputChange('password', e.target.value)}
                placeholder="Create a secure password"
                disabled={submitting}
                required
              />
              {errors.password && <span className={styles.formError}>{errors.password}</span>}
              <small className={styles.passwordHint}>Must be at least 8 characters</small>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="confirmPassword">
                Confirm Password <span className={styles.requiredIndicator}>*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={clsx(styles.formInput, errors.confirmPassword && styles.formInputError)}
                value={formData.confirmPassword}
                onChange={e => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Re-enter your password"
                disabled={submitting}
                required
              />
              {errors.confirmPassword && (
                <span className={styles.formError}>{errors.confirmPassword}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="title">
                Title/Role (Optional)
              </label>
              <input
                id="title"
                type="text"
                className={clsx(styles.formInput, errors.title && styles.formInputError)}
                value={formData.title || ''}
                onChange={e => handleInputChange('title', e.target.value)}
                placeholder="e.g., Volunteer, Coordinator"
                disabled={submitting}
                maxLength={100}
              />
              {errors.title && <span className={styles.formError}>{errors.title}</span>}
            </div>

            <button className={styles.submitButton} type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className={styles.loadingSpinner} />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;
