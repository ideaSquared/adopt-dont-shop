import { useAuth } from '@/contexts/AuthContext';
import { RegisterRequest } from '@/types';
import { Alert, Button, Card, Input } from '@adopt-dont-shop/components';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
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

const RegisterCard = styled(Card)`
  width: 100%;
  max-width: 500px;
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

const PasswordRequirements = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.text.dim};
  margin-top: 0.5rem;

  ul {
    margin: 0.5rem 0 0 1rem;
    padding: 0;
  }

  li {
    margin-bottom: 0.25rem;

    &.valid {
      color: ${props => props.theme.colors.semantic.success.main};
    }

    &.invalid {
      color: ${props => props.theme.colors.semantic.error.main};
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
    color: ${props => props.theme.text.dim};
    line-height: 1.4;

    a {
      color: ${props => props.theme.colors.primary.main};
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

const LoginPrompt = styled.div`
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

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
    acceptTerms: z
      .boolean()
      .refine(val => val === true, 'You must accept the terms and conditions'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const watchPassword = watch('password', '');

  const getPasswordRequirements = () => {
    return [
      { text: 'At least 8 characters', valid: watchPassword.length >= 8 },
      { text: 'One lowercase letter', valid: /[a-z]/.test(watchPassword) },
      { text: 'One uppercase letter', valid: /[A-Z]/.test(watchPassword) },
      { text: 'One number', valid: /[0-9]/.test(watchPassword) },
      { text: 'One special character', valid: /[^a-zA-Z0-9]/.test(watchPassword) },
    ];
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const registerData: RegisterRequest = {
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        firstName: data.firstName,
        lastName: data.lastName,
      };

      await registerUser(registerData);
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(
        err.response?.data?.message || err.message || 'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <RegisterCard>
        <Header>
          <h1>Create Your Account</h1>
          <p>Join thousands of people who have found their perfect pet companion</p>
        </Header>

        {error && <StyledAlert variant='error'>{error}</StyledAlert>}

        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormRow>
            <FormGroup>
              <Input
                label='First Name'
                placeholder='Enter your first name'
                error={errors.firstName?.message}
                {...register('firstName')}
              />
            </FormGroup>
            <FormGroup>
              <Input
                label='Last Name'
                placeholder='Enter your last name'
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </FormGroup>
          </FormRow>

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
              placeholder='Create a strong password'
              error={errors.password?.message}
              {...register('password')}
            />
            {watchPassword && (
              <PasswordRequirements>
                <div>Password requirements:</div>
                <ul>
                  {getPasswordRequirements().map((req, index) => (
                    <li key={index} className={req.valid ? 'valid' : 'invalid'}>
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
              placeholder='Confirm your password'
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </FormGroup>

          <TermsCheckbox>
            <input type='checkbox' id='acceptTerms' {...register('acceptTerms')} />
            <label htmlFor='acceptTerms'>
              I agree to the{' '}
              <Link to='/terms' target='_blank'>
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to='/privacy' target='_blank'>
                Privacy Policy
              </Link>
            </label>
          </TermsCheckbox>
          {errors.acceptTerms && (
            <div style={{ color: 'red', fontSize: '0.8rem', marginTop: '-0.5rem' }}>
              {errors.acceptTerms.message}
            </div>
          )}

          <Button
            type='submit'
            size='lg'
            variant='primary'
            disabled={isLoading}
            style={{ width: '100%' }}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </Form>

        <LoginPrompt>
          <p>Already have an account?</p>
          <Link to='/login'>Sign in instead</Link>
        </LoginPrompt>
      </RegisterCard>
    </Container>
  );
};
