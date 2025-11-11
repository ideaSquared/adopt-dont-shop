import { useStatsig } from '@/hooks/useStatsig';
import { authService } from '@/services';
import { Alert, Button, Card, Input } from '@adopt-dont-shop/components';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { z } from 'zod';

const Container = styled.div`
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(
    135deg,
    ${props => props.theme.background.primary} 0%,
    ${props => props.theme.background.secondary} 100%
  );
`;

const ResetPasswordCard = styled(Card)`
  width: 100%;
  max-width: 450px;
  padding: 2rem;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: ${props => props.theme.text.primary};
  }

  p {
    color: ${props => props.theme.text.secondary};
    line-height: 1.6;
  }
`;

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

const PasswordRequirements = styled.div`
  background: ${props => props.theme.background.tertiary || props.theme.background.secondary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 8px;
  padding: 1rem;
  margin-top: 0.5rem;

  h4 {
    font-size: 0.9rem;
    color: ${props => props.theme.text.primary};
    margin: 0 0 0.5rem 0;
  }

  ul {
    margin: 0;
    padding-left: 1.5rem;
    list-style: disc;
  }

  li {
    font-size: 0.85rem;
    color: ${props => props.theme.text.secondary};
    line-height: 1.5;
  }
`;

const BackToLoginLink = styled(Link)`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.primary[500]};
  text-decoration: none;
  text-align: center;
  margin-top: 1rem;
  display: block;

  &:hover {
    text-decoration: underline;
  }
`;

const StyledAlert = styled(Alert)`
  margin-bottom: 1.5rem;
`;

const SuccessContainer = styled.div`
  text-align: center;

  h2 {
    font-size: 1.5rem;
    color: ${props => props.theme.colors.semantic.success[600]};
    margin-bottom: 1rem;
  }

  p {
    color: ${props => props.theme.text.secondary};
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .redirect-message {
    font-size: 0.9rem;
    color: ${props => props.theme.text.tertiary || props.theme.text.secondary};
    font-style: italic;
  }
`;

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const navigate = useNavigate();
  const { logEvent } = useStatsig();

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Validate token exists and is valid format
  useEffect(() => {
    if (!token || token === 'invalid-token' || token === 'expired-token') {
      setError('Invalid token. Please request a new password reset link.');
      logEvent('password_reset_token_missing', 1, {});
    }
  }, [token, logEvent]);

  // Countdown and redirect after successful password reset
  useEffect(() => {
    if (isSuccess && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (isSuccess && redirectCountdown === 0) {
      navigate('/login');
    }
  }, [isSuccess, redirectCountdown, navigate]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Log password reset attempt
      logEvent('password_reset_attempted', 1, {
        has_token: String(!!token),
      });

      await authService.resetPassword(token, data.password);

      // Show success message
      setIsSuccess(true);

      // Log successful reset
      logEvent('password_reset_completed', 1, {});
    } catch (err: unknown) {
      console.error('Reset password error:', err);

      const error = err as Error & { response?: { status?: number; data?: { message?: string } } };

      let errorMessage = 'Failed to reset password. Please try again.';

      // Handle specific error cases
      if (error.response?.status === 401 || error.response?.status === 400) {
        errorMessage =
          'Invalid token. Please request a new password reset link.';
        logEvent('password_reset_token_invalid', 1, {
          error_status: String(error.response?.status || 'unknown'),
        });
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setError(errorMessage);

      // Log error
      logEvent('password_reset_failed', 1, {
        error_message: error.message || 'Unknown error',
        error_status: String(error.response?.status || 'unknown'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Container>
        <ResetPasswordCard>
          <SuccessContainer>
            <h2>Password Reset Successful!</h2>
            <p>Your password has been successfully updated.</p>
            <p>You can now log in with your new password.</p>
            <p className='redirect-message'>Redirecting to login in {redirectCountdown} seconds...</p>

            <Button
              type='button'
              size='lg'
              variant='primary'
              onClick={() => navigate('/login')}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              Go to Login Now
            </Button>
          </SuccessContainer>
        </ResetPasswordCard>
      </Container>
    );
  }

  return (
    <Container>
      <ResetPasswordCard>
        <Header>
          <h1>Reset Your Password</h1>
          <p>Enter your new password below to complete the reset process.</p>
        </Header>

        {error && <StyledAlert variant='error'>{error}</StyledAlert>}

        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Input
              label='New Password'
              type='password'
              placeholder='Enter new password'
              error={errors.password?.message}
              autoFocus
              disabled={!token}
              {...register('password')}
            />
            <PasswordRequirements>
              <h4>Password Requirements:</h4>
              <ul>
                <li>At least 8 characters long</li>
                <li>At least one uppercase letter (A-Z)</li>
                <li>At least one lowercase letter (a-z)</li>
                <li>At least one number (0-9)</li>
                <li>At least one special character (@$!%*?&)</li>
              </ul>
            </PasswordRequirements>
          </FormGroup>

          <FormGroup>
            <Input
              label='Confirm Password'
              type='password'
              placeholder='Confirm new password'
              error={errors.confirmPassword?.message}
              disabled={!token}
              {...register('confirmPassword')}
            />
          </FormGroup>

          <Button
            type='submit'
            size='lg'
            variant='primary'
            disabled={isLoading || !token}
            style={{ width: '100%' }}
          >
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </Button>
        </Form>

        <BackToLoginLink to='/login'>Back to Login</BackToLoginLink>
      </ResetPasswordCard>
    </Container>
  );
};
