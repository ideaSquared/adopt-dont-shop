import { authService } from '@/services';
import { Alert, Button, Card } from '@adopt-dont-shop/lib.components';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

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

const VerifyEmailCard = styled(Card)`
  width: 100%;
  max-width: 500px;
  padding: 2.5rem;
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
    font-size: 1rem;
  }
`;

const IconContainer = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 4rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;

  &::after {
    content: '';
    width: 48px;
    height: 48px;
    border: 5px solid ${props => props.theme.border.color.primary};
    border-bottom-color: ${props => props.theme.colors.primary};
    border-radius: 50%;
    animation: rotation 1s linear infinite;
  }

  @keyframes rotation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const ResendSection = styled.div`
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${props => props.theme.border.color.primary};

  p {
    color: ${props => props.theme.text.secondary};
    margin-bottom: 1rem;
    font-size: 0.95rem;
  }
`;

type VerificationStatus = 'verifying' | 'success' | 'error' | 'expired';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('No verification token provided');
        return;
      }

      try {
        await authService.verifyEmail(token);
        setStatus('success');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login?verified=true');
        }, 3000);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Verification failed';

        if (message.includes('expired')) {
          setStatus('expired');
          setErrorMessage('Your verification link has expired. Please request a new one.');
        } else {
          setStatus('error');
          setErrorMessage(message);
        }
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const handleResendEmail = async () => {
    try {
      setIsResending(true);
      setResendSuccess(false);
      await authService.resendVerificationEmail();
      setResendSuccess(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to resend verification email'
      );
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <>
            <IconContainer>⏳</IconContainer>
            <Header>
              <h1>Verifying Your Email</h1>
              <p>Please wait while we verify your email address...</p>
            </Header>
            <LoadingSpinner />
          </>
        );

      case 'success':
        return (
          <>
            <IconContainer>✅</IconContainer>
            <Header>
              <h1>Email Verified!</h1>
              <p>
                Your email has been successfully verified. You can now access all features of Adopt
                Don't Shop.
              </p>
            </Header>
            <Alert variant='success'>Verification successful! Redirecting to login...</Alert>
            <ButtonGroup>
              <Button onClick={() => navigate('/login')}>Go to Login</Button>
            </ButtonGroup>
          </>
        );

      case 'expired':
        return (
          <>
            <IconContainer>⏰</IconContainer>
            <Header>
              <h1>Link Expired</h1>
              <p>Your verification link has expired. Verification links are valid for 24 hours.</p>
            </Header>
            <Alert variant='warning'>{errorMessage}</Alert>
            <ResendSection>
              <p>Don't worry! You can request a new verification email.</p>
              <Button onClick={handleResendEmail} disabled={isResending} isFullWidth>
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              {resendSuccess && (
                <div style={{ marginTop: '1rem' }}>
                  <Alert variant='success'>
                    Verification email sent! Please check your inbox.
                  </Alert>
                </div>
              )}
            </ResendSection>
            <ButtonGroup>
              <Button variant='secondary' onClick={() => navigate('/login')}>
                Back to Login
              </Button>
            </ButtonGroup>
          </>
        );

      case 'error':
        return (
          <>
            <IconContainer>❌</IconContainer>
            <Header>
              <h1>Verification Failed</h1>
              <p>We couldn't verify your email address.</p>
            </Header>
            <Alert variant='error'>{errorMessage}</Alert>
            <ResendSection>
              <p>You can try requesting a new verification email.</p>
              <Button onClick={handleResendEmail} disabled={isResending} isFullWidth>
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              {resendSuccess && (
                <div style={{ marginTop: '1rem' }}>
                  <Alert variant='success'>
                    Verification email sent! Please check your inbox.
                  </Alert>
                </div>
              )}
            </ResendSection>
            <ButtonGroup>
              <Link to='/login'>
                <Button variant='secondary' isFullWidth>
                  Back to Login
                </Button>
              </Link>
              <Link to='/help'>
                <Button variant='ghost' isFullWidth>
                  Contact Support
                </Button>
              </Link>
            </ButtonGroup>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Container>
      <VerifyEmailCard>{renderContent()}</VerifyEmailCard>
    </Container>
  );
};

export default VerifyEmailPage;
