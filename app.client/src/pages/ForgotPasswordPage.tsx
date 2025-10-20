import { useStatsig } from '@/hooks/useStatsig';
import { authService } from '@/services';
import { Alert, Button, Card, Input } from '@adopt-dont-shop/components';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
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

const ForgotPasswordCard = styled(Card)`
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

  .email-highlight {
    color: ${props => props.theme.text.primary};
    font-weight: 600;
  }
`;

const InfoBox = styled.div`
  background: ${props => props.theme.background.tertiary || props.theme.background.secondary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;

  p {
    font-size: 0.9rem;
    color: ${props => props.theme.text.secondary};
    margin: 0;
    line-height: 1.5;
  }

  strong {
    color: ${props => props.theme.text.primary};
  }
`;

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string>('');
  const { logEvent } = useStatsig();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Log password reset attempt
      logEvent('password_reset_requested', 1, {
        email: data.email,
      });

      await authService.forgotPassword(data.email);

      // Always show success message (security best practice - don't reveal if email exists)
      setSubmittedEmail(data.email);
      setIsSuccess(true);

      // Log successful request
      logEvent('password_reset_email_sent', 1, {
        email: data.email,
      });
    } catch (err: unknown) {
      console.error('Forgot password error:', err);

      // Log error
      logEvent('password_reset_request_failed', 1, {
        email: data.email,
        error_message: err instanceof Error ? err.message : 'Unknown error',
      });

      // For security, still show success even on error (don't reveal if email exists)
      // However, if there's a rate limit or server error, we should show that
      const error = err as Error & { response?: { status?: number; data?: { message?: string } } };

      if (error.response?.status === 429) {
        setError('Too many requests. Please try again later.');
      } else if (error.response?.status && error.response.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        // Don't reveal whether email exists - show success
        setSubmittedEmail(data.email);
        setIsSuccess(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Container>
        <ForgotPasswordCard>
          <SuccessContainer>
            <h2>Check Your Email</h2>
            <p>
              If an account exists for <span className='email-highlight'>{submittedEmail}</span>,
              you will receive password reset instructions shortly.
            </p>
            <p>Please check your email inbox and follow the link to reset your password.</p>

            <InfoBox>
              <p>
                <strong>Didn&apos;t receive the email?</strong>
              </p>
              <p>Check your spam folder or wait a few minutes before trying again.</p>
            </InfoBox>

            <BackToLoginLink to='/login'>Return to Login</BackToLoginLink>
          </SuccessContainer>
        </ForgotPasswordCard>
      </Container>
    );
  }

  return (
    <Container>
      <ForgotPasswordCard>
        <Header>
          <h1>Forgot Password?</h1>
          <p>
            Enter your email address and we&apos;ll send you instructions to reset your password.
          </p>
        </Header>

        {error && <StyledAlert variant='error'>{error}</StyledAlert>}

        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Input
              label='Email Address'
              type='email'
              placeholder='Enter your email'
              error={errors.email?.message}
              autoFocus
              {...register('email')}
            />
          </FormGroup>

          <Button
            type='submit'
            size='lg'
            variant='primary'
            disabled={isLoading}
            style={{ width: '100%' }}
          >
            {isLoading ? 'Sending Instructions...' : 'Send Reset Instructions'}
          </Button>
        </Form>

        <BackToLoginLink to='/login'>Back to Login</BackToLoginLink>
      </ForgotPasswordCard>
    </Container>
  );
};
