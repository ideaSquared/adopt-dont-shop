import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import styled from 'styled-components';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Alert,
  Spinner,
  TextInput,
  Heading,
  Text,
} from '@adopt-dont-shop/components';
import { useAuth } from '@/contexts/AuthContext';
import { DevLoginPanel } from '@/components/dev/DevLoginPanel';
import type { LoginRequest } from '@/types';

// Validation schema for login form
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Styled components using theme
const LoginPageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.primary[50]} 0%,
    ${props => props.theme.colors.primary[100]} 100%
  );
  padding: 2rem 1rem;
`;

const LoginContainer = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const BrandSection = styled.div`
  text-align: center;
  margin-bottom: 1rem;
`;

const LoginCard = styled(Card)`
  box-shadow: ${props => props.theme.shadows.xl};
  border: 1px solid ${props => props.theme.colors.neutral[200]};

  ${props =>
    props.theme.mode === 'dark' &&
    `
    border-color: ${props.theme.colors.neutral[700]};
  `}
`;

const FormSection = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const HelpSection = styled.div`
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${props => props.theme.colors.neutral[200]};

  ${props =>
    props.theme.mode === 'dark' &&
    `
    border-color: ${props.theme.colors.neutral[700]};
  `}
`;

const HelpLink = styled.a`
  color: ${props => props.theme.colors.primary[600]};
  text-decoration: none;
  font-weight: ${props => props.theme.typography.weight.medium};
  transition: color 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.primary[700]};
    text-decoration: underline;
  }
`;

/**
 * Login page for the Rescue App
 * Uses styled-components with theme integration
 */
export const LoginPage: React.FC = () => {
  const { login, isLoading, isAuthenticated } = useAuth();
  const [loginError, setLoginError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to='/dashboard' replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoginError('');
      const loginRequest: LoginRequest = {
        email: data.email,
        password: data.password,
      };

      await login(loginRequest);
      // Navigation will happen automatically via AuthContext
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Login failed. Please check your credentials and try again.';
      setLoginError(errorMessage);
    }
  };

  return (
    <>
      <DevLoginPanel />
      <LoginPageWrapper>
        <LoginContainer>
          <BrandSection>
            <Heading level='h1' size='2xl' weight='bold' color='primary'>
              Rescue App
            </Heading>
            <Text size='lg' color='muted'>
              Sign in to your rescue account
            </Text>
          </BrandSection>

          <LoginCard>
            <CardHeader>
              <Heading level='h2' size='lg' weight='semibold'>
                Welcome Back
              </Heading>
            </CardHeader>
            <CardContent>
              <FormSection onSubmit={handleSubmit(onSubmit)}>
                {/* Email Field */}
                <InputGroup>
                  <TextInput
                    {...register('email')}
                    type='email'
                    label='Email Address'
                    placeholder='Enter your email'
                    error={errors.email?.message}
                    autoComplete='email'
                  />
                </InputGroup>

                {/* Password Field */}
                <InputGroup>
                  <TextInput
                    {...register('password')}
                    type='password'
                    label='Password'
                    placeholder='Enter your password'
                    error={errors.password?.message}
                    autoComplete='current-password'
                  />
                </InputGroup>

                {/* Error Alert */}
                {loginError && <Alert variant='error'>{loginError}</Alert>}

                {/* Submit Button */}
                <Button
                  type='submit'
                  variant='primary'
                  size='lg'
                  disabled={isSubmitting || isLoading}
                  style={{ width: '100%' }}
                >
                  {isSubmitting || isLoading ? (
                    <>
                      <Spinner size='sm' style={{ marginRight: '0.5rem' }} />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </FormSection>

              <HelpSection>
                <Text size='sm' color='muted'>
                  Need help accessing your account?{' '}
                  <HelpLink href='mailto:support@rescueapp.com'>Contact Support</HelpLink>
                </Text>
              </HelpSection>
            </CardContent>
          </LoginCard>
        </LoginContainer>
      </LoginPageWrapper>
    </>
  );
};
