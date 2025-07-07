import { useAuth } from '@/contexts/AuthContext';
import { LoginRequest, RegisterRequest } from '@/types';
import React, { useState } from 'react';
import styled from 'styled-components';

// Styled Components
const AuthContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const AuthCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
`;

const AuthHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;

  h2 {
    color: #2d3748;
    margin-bottom: 0.5rem;
    font-size: 1.75rem;
    font-weight: 600;
  }

  p {
    color: #718096;
    font-size: 0.95rem;
  }
`;

const ErrorMessage = styled.div`
  background: #fed7d7;
  color: #c53030;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
`;

const AuthForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;

  label {
    color: #374151;
    font-weight: 500;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const PasswordHint = styled.small`
  color: #6b7280;
  font-size: 0.8rem;
  margin-top: 0.25rem;
`;

const HelperText = styled.small`
  color: #6b7280;
  margin-top: 0.5rem;
  display: block;
  font-size: 0.875rem;
  line-height: 1.4;
`;

const AuthButton = styled.button<{ $primary?: boolean }>`
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;

  ${props =>
    props.$primary &&
    `
    background: #667eea;
    color: white;

    &:hover:not(:disabled) {
      background: #5a67d8;
      transform: translateY(-1px);
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const AuthFooter = styled.div`
  margin-top: 1.5rem;
  text-align: center;
`;

const AuthToggle = styled.button`
  background: none;
  border: none;
  color: #667eea;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    color: #5a67d8;
  }
`;

interface AuthPageProps {
  onSuccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { login, register, isLoading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [loginForm, setLoginForm] = useState<LoginRequest>({
    email: '',
    password: '',
  });

  // Register form state
  const [registerForm, setRegisterForm] = useState<RegisterRequest>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    userType: 'adopter',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await login(loginForm);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password requirements
    if (registerForm.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      // Remove confirmPassword before sending to backend
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword: _, ...registerData } = registerForm;
      await register(registerData);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <AuthContainer>
      <AuthCard>
        <AuthHeader>
          <h2>{isLoginMode ? 'Sign In' : 'Create Account'}</h2>
          <p>
            {isLoginMode ? "Welcome back to Adopt Don't Shop" : 'Join our pet adoption community'}
          </p>
        </AuthHeader>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {isLoginMode ? (
          <AuthForm onSubmit={handleLogin}>
            <FormGroup>
              <label htmlFor='email'>Email Address</label>
              <Input
                id='email'
                type='email'
                value={loginForm.email}
                onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder='Enter your email'
                required
              />
            </FormGroup>

            <FormGroup>
              <label htmlFor='password'>Password</label>
              <Input
                id='password'
                type='password'
                value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder='Enter your password'
                required
              />
            </FormGroup>

            <AuthButton type='submit' $primary disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </AuthButton>

            <HelperText>
              <strong>Adopters only:</strong> This app is for pet adopters. <br />
              Rescue staff should use the <strong>Rescue App</strong> (port 3002) <br />
              Admins should use the <strong>Admin App</strong> (port 3001)
            </HelperText>
          </AuthForm>
        ) : (
          <AuthForm onSubmit={handleRegister}>
            <FormRow>
              <FormGroup>
                <label htmlFor='firstName'>First Name</label>
                <Input
                  id='firstName'
                  type='text'
                  value={registerForm.firstName}
                  onChange={e => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                  placeholder='Your first name'
                  required
                />
              </FormGroup>

              <FormGroup>
                <label htmlFor='lastName'>Last Name</label>
                <Input
                  id='lastName'
                  type='text'
                  value={registerForm.lastName}
                  onChange={e => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                  placeholder='Your last name'
                  required
                />
              </FormGroup>
            </FormRow>

            <FormGroup>
              <label htmlFor='registerEmail'>Email Address</label>
              <Input
                id='registerEmail'
                type='email'
                value={registerForm.email}
                onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
                placeholder='Enter your email address'
                required
              />
            </FormGroup>

            <FormGroup>
              <label htmlFor='phoneNumber'>Phone Number (Optional)</label>
              <Input
                id='phoneNumber'
                type='tel'
                value={registerForm.phoneNumber}
                onChange={e => setRegisterForm({ ...registerForm, phoneNumber: e.target.value })}
                placeholder='(555) 123-4567'
              />
            </FormGroup>

            <FormGroup>
              <label htmlFor='registerPassword'>Password</label>
              <Input
                id='registerPassword'
                type='password'
                value={registerForm.password}
                onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                placeholder='Create a strong password'
                required
                minLength={8}
              />
              <PasswordHint>
                Must be at least 8 characters with uppercase, lowercase, number, and special
                character
              </PasswordHint>
            </FormGroup>

            <FormGroup>
              <label htmlFor='confirmPassword'>Confirm Password</label>
              <Input
                id='confirmPassword'
                type='password'
                value={registerForm.confirmPassword}
                onChange={e =>
                  setRegisterForm({ ...registerForm, confirmPassword: e.target.value })
                }
                placeholder='Confirm your password'
                required
              />
            </FormGroup>

            <FormGroup>
              <label htmlFor='userType'>I am a:</label>
              <Select
                id='userType'
                value={registerForm.userType}
                onChange={e =>
                  setRegisterForm({
                    ...registerForm,
                    userType: e.target.value as 'adopter',
                  })
                }
              >
                <option value='adopter'>Pet Adopter</option>
              </Select>
              <HelperText>
                Rescue staff should register at the <strong>Rescue App</strong> (port 3002)
              </HelperText>
            </FormGroup>

            <AuthButton type='submit' $primary disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </AuthButton>
          </AuthForm>
        )}

        <AuthFooter>
          <AuthToggle
            type='button'
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError(null);
            }}
          >
            {isLoginMode ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </AuthToggle>
        </AuthFooter>
      </AuthCard>
    </AuthContainer>
  );
};

export default AuthPage;
