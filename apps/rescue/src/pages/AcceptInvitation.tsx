import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  NEW_PASSWORD_HINT,
  NewPasswordSchema,
  useOneTimeUrlToken,
} from '@adopt-dont-shop/lib.auth';
import { Alert, Button, FormField, Input, Spinner } from '@adopt-dont-shop/lib.components';
import { PartyPopper } from 'lucide-react';
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
  const navigate = useNavigate();
  // Capture the single-use invitation token ONCE, then strip it from the
  // address bar (ADS-1012) so it doesn't linger in browser history or Referer
  // headers — an invitation token also grants a role at a rescue. Held in
  // state so the URL rewrite doesn't pull it out from under the fetch/submit.
  const token = useOneTimeUrlToken();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<AcceptInvitationFormData>({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    title: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // The link is single-use: fetch the details once, never refetch or retry.
  const detailsQuery = useQuery({
    queryKey: ['invitations', 'details', token],
    queryFn: () => invitationService.getInvitationDetails(token ?? ''),
    enabled: Boolean(token),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const details = detailsQuery.data ?? null;
  const invitationEmail = details?.email ?? '';
  const rescueName = details?.rescueName ?? null;
  const invitedByName = details?.invitedByName ?? null;
  const role = details?.role ?? null;
  const loading = Boolean(token) && detailsQuery.isLoading;

  const loadError = (() => {
    if (!token) {
      return 'Invalid invitation link. No token provided.';
    }
    if (detailsQuery.isError) {
      return 'Failed to load invitation details. The link may be invalid or expired.';
    }
    if (detailsQuery.isSuccess && !details) {
      return 'Invitation not found or has expired.';
    }
    return null;
  })();
  const error = submitError ?? loadError;

  const acceptMutation = useMutation({
    mutationFn: invitationService.acceptInvitation,
    // Failures show in the page's own error alert.
    onError: () => undefined,
  });
  const submitting = acceptMutation.isPending;

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

    // The gateway and auth service enforce this same shared rule, so check it
    // here first rather than letting the request come back as a 400.
    const passwordCheck = NewPasswordSchema.safeParse(formData.password);
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordCheck.success) {
      newErrors.password = passwordCheck.error.issues[0]?.message ?? NEW_PASSWORD_HINT;
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

    setSubmitError(null);

    try {
      await acceptMutation.mutateAsync({
        token,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
        title: formData.title,
      });

      setSuccess(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to accept invitation. Please try again.'
      );
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
            <Spinner label="Loading invitation details" />
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
            <p>Account created</p>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.successContainer}>
              <div className={styles.successIcon}>
                <PartyPopper size="1em" aria-hidden="true" />
              </div>
              <h2>Account Created!</h2>
              <p>
                We created your account. You can now log in to start working with your rescue team.
              </p>
              <Button variant="primary" onClick={handleGoToLogin}>
                Go to Login
              </Button>
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
            <Alert variant="error" title="Error">
              {error}
            </Alert>
            <Button variant="primary" isFullWidth onClick={handleGoToLogin}>
              Go to Homepage
            </Button>
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
              <strong>
                {invitedByName && rescueName ? (
                  <>
                    You've been invited by {invitedByName} to join {rescueName}
                    {role ? <> as {role}</> : null}
                  </>
                ) : rescueName ? (
                  <>
                    You've been invited to join {rescueName}
                    {role ? <> as {role}</> : null}
                  </>
                ) : (
                  <>You've been invited to join a rescue organization</>
                )}
              </strong>
              You're registering with: {invitationEmail}
            </p>
          </div>

          {error && (
            <Alert variant="error" title="Error">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <FormField label="First Name" htmlFor="firstName" required error={errors.firstName}>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={e => handleInputChange('firstName', e.target.value)}
                placeholder="Enter your first name"
                disabled={submitting}
                required
                aria-required={true}
                aria-invalid={!!errors.firstName}
                autoFocus
                autoComplete="given-name"
              />
            </FormField>

            <FormField label="Last Name" htmlFor="lastName" required error={errors.lastName}>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={e => handleInputChange('lastName', e.target.value)}
                placeholder="Enter your last name"
                disabled={submitting}
                required
                aria-required={true}
                aria-invalid={!!errors.lastName}
                autoComplete="family-name"
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="password"
              required
              error={errors.password}
              description={NEW_PASSWORD_HINT}
            >
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={e => handleInputChange('password', e.target.value)}
                placeholder="Create a secure password"
                disabled={submitting}
                required
                aria-required={true}
                aria-invalid={!!errors.password}
                autoComplete="new-password"
              />
            </FormField>

            <FormField
              label="Confirm Password"
              htmlFor="confirmPassword"
              required
              error={errors.confirmPassword}
            >
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={e => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Re-enter your password"
                disabled={submitting}
                required
                aria-required={true}
                aria-invalid={!!errors.confirmPassword}
                autoComplete="new-password"
              />
            </FormField>

            <FormField label="Title/Role (Optional)" htmlFor="title" error={errors.title}>
              <Input
                id="title"
                type="text"
                value={formData.title || ''}
                onChange={e => handleInputChange('title', e.target.value)}
                placeholder="e.g., Volunteer, Coordinator"
                disabled={submitting}
                maxLength={100}
                aria-invalid={!!errors.title}
              />
            </FormField>

            <Button type="submit" variant="primary" isFullWidth isLoading={submitting}>
              {submitting ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;
