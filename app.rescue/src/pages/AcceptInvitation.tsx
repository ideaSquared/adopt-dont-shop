import { AcceptInvitationPayload, InvitationDetails } from '@adopt-dont-shop/lib-invitations';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { invitationService } from '../services/libraryServices';

interface AcceptInvitationFormData {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  title?: string;
}

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const Card = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 100%;
  overflow: hidden;
`;

const CardHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;

  h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    font-weight: 700;
  }

  p {
    margin: 0;
    opacity: 0.9;
    font-size: 0.95rem;
  }
`;

const CardBody = styled.div`
  padding: 2rem;
`;

const InvitationInfo = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-left: 4px solid #667eea;

  p {
    margin: 0;
    color: #666;
    font-size: 0.9rem;

    strong {
      color: #333;
      display: block;
      margin-bottom: 0.25rem;
    }
  }
`;

const Form = styled.form``;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
`;

const RequiredIndicator = styled.span`
  color: #dc3545;
`;

const FormInput = styled.input<{ hasError?: boolean }>`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid ${props => props.hasError ? '#dc3545' : '#e9ecef'};
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#dc3545' : '#667eea'};
  }

  &:disabled {
    background-color: #f8f9fa;
    color: #6c757d;
  }
`;

const FormError = styled.span`
  display: block;
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 1rem;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const LoadingSpinner = styled.span`
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorContainer = styled.div`
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  color: #856404;

  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
  }
`;

const SuccessContainer = styled.div`
  text-align: center;
  padding: 2rem;

  h2 {
    color: #28a745;
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
  }

  p {
    color: #666;
    margin: 0 0 1.5rem 0;
  }
`;

const SuccessIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const LoginButton = styled.button`
  padding: 0.875rem 2rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #5568d3;
  }
`;

const PasswordHint = styled.small`
  display: block;
  color: #666;
  font-size: 0.8rem;
  margin-top: 0.25rem;
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: #666;
`;

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
        err instanceof Error
          ? err.message
          : 'Failed to accept invitation. Please try again.'
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
      <PageContainer>
        <Card>
          <CardHeader>
            <h1>Accept Invitation</h1>
            <p>Loading invitation details...</p>
          </CardHeader>
          <LoadingContainer>
            <LoadingSpinner />
          </LoadingContainer>
        </Card>
      </PageContainer>
    );
  }

  if (success) {
    return (
      <PageContainer>
        <Card>
          <CardHeader>
            <h1>Welcome!</h1>
            <p>Your account has been created successfully</p>
          </CardHeader>
          <CardBody>
            <SuccessContainer>
              <SuccessIcon>🎉</SuccessIcon>
              <h2>Account Created!</h2>
              <p>
                Your account has been successfully created. You can now log in to start working with
                your rescue team.
              </p>
              <LoginButton onClick={handleGoToLogin}>
                Go to Login
              </LoginButton>
            </SuccessContainer>
          </CardBody>
        </Card>
      </PageContainer>
    );
  }

  if (error && !invitationEmail) {
    return (
      <PageContainer>
        <Card>
          <CardHeader>
            <h1>Invalid Invitation</h1>
            <p>Unable to process invitation</p>
          </CardHeader>
          <CardBody>
            <ErrorContainer>
              <h3>⚠️ Error</h3>
              <p>{error}</p>
            </ErrorContainer>
            <LoginButton onClick={handleGoToLogin} style={{ width: '100%' }}>
              Go to Homepage
            </LoginButton>
          </CardBody>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Card>
        <CardHeader>
          <h1>Join the Team!</h1>
          <p>Create your account to get started</p>
        </CardHeader>
        <CardBody>
          <InvitationInfo>
            <p>
              <strong>You've been invited to join a rescue organization</strong>
              You're registering with: {invitationEmail}
            </p>
          </InvitationInfo>

          {error && (
            <ErrorContainer>
              <h3>⚠️ Error</h3>
              <p>{error}</p>
            </ErrorContainer>
          )}

          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <FormLabel htmlFor="firstName">
                First Name <RequiredIndicator>*</RequiredIndicator>
              </FormLabel>
              <FormInput
                id="firstName"
                type="text"
                hasError={!!errors.firstName}
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter your first name"
                disabled={submitting}
                required
                autoFocus
              />
              {errors.firstName && <FormError>{errors.firstName}</FormError>}
            </FormGroup>

            <FormGroup>
              <FormLabel htmlFor="lastName">
                Last Name <RequiredIndicator>*</RequiredIndicator>
              </FormLabel>
              <FormInput
                id="lastName"
                type="text"
                hasError={!!errors.lastName}
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter your last name"
                disabled={submitting}
                required
              />
              {errors.lastName && <FormError>{errors.lastName}</FormError>}
            </FormGroup>

            <FormGroup>
              <FormLabel htmlFor="password">
                Password <RequiredIndicator>*</RequiredIndicator>
              </FormLabel>
              <FormInput
                id="password"
                type="password"
                hasError={!!errors.password}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Create a secure password"
                disabled={submitting}
                required
              />
              {errors.password && <FormError>{errors.password}</FormError>}
              <PasswordHint>Must be at least 8 characters</PasswordHint>
            </FormGroup>

            <FormGroup>
              <FormLabel htmlFor="confirmPassword">
                Confirm Password <RequiredIndicator>*</RequiredIndicator>
              </FormLabel>
              <FormInput
                id="confirmPassword"
                type="password"
                hasError={!!errors.confirmPassword}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Re-enter your password"
                disabled={submitting}
                required
              />
              {errors.confirmPassword && <FormError>{errors.confirmPassword}</FormError>}
            </FormGroup>

            <FormGroup>
              <FormLabel htmlFor="title">Title/Role (Optional)</FormLabel>
              <FormInput
                id="title"
                type="text"
                hasError={!!errors.title}
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Volunteer, Coordinator"
                disabled={submitting}
                maxLength={100}
              />
              {errors.title && <FormError>{errors.title}</FormError>}
            </FormGroup>

            <SubmitButton type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <LoadingSpinner />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </SubmitButton>
          </Form>
        </CardBody>
      </Card>
    </PageContainer>
  );
};

export default AcceptInvitation;
