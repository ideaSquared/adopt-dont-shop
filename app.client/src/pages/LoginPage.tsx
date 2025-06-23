import { useAuth } from '@/contexts/AuthContext';
import { Alert, Button, Card, Input } from '@adopt-dont-shop/components';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
    ${props => props.theme.background.body} 0%,
    ${props => props.theme.background.contrast} 100%
  );
`;

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  padding: 2rem;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: ${props => props.theme.text.body};
  }

  p {
    color: ${props => props.theme.text.dim};
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

const ForgotPasswordLink = styled(Link)`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.primary.main};
  text-decoration: none;
  text-align: right;

  &:hover {
    text-decoration: underline;
  }
`;

const SignupPrompt = styled.div`
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${props => props.theme.border.color.default};

  p {
    color: ${props => props.theme.text.dim};
    margin-bottom: 0.5rem;
  }

  a {
    color: ${props => props.theme.colors.primary.main};
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const StyledAlert = styled(Alert)`
  margin-bottom: 1.5rem;
`;

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Login failed. Please check your credentials and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <LoginCard>
        <Header>
          <h1>Welcome Back</h1>
          <p>Sign in to your account to continue your adoption journey</p>
        </Header>

        {error && <StyledAlert variant='error'>{error}</StyledAlert>}

        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Input
              label='Email Address'
              type='email'
              placeholder='Enter your email'
              error={errors.email?.message}
              {...register('email')}
            />
          </FormGroup>

          <FormGroup>
            <Input
              label='Password'
              type='password'
              placeholder='Enter your password'
              error={errors.password?.message}
              {...register('password')}
            />
            <ForgotPasswordLink to='/forgot-password'>Forgot your password?</ForgotPasswordLink>
          </FormGroup>

          <Button
            type='submit'
            size='lg'
            variant='primary'
            disabled={isLoading}
            style={{ width: '100%' }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </Form>

        <SignupPrompt>
          <p>Don't have an account?</p>
          <Link to='/register'>Create a new account</Link>
        </SignupPrompt>
      </LoginCard>
    </Container>
  );
};
