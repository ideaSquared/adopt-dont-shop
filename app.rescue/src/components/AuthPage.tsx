import React, { useState } from 'react';
import styled from 'styled-components';
import { Card, Text, Heading } from '@adopt-dont-shop/components';
import { useAuth } from '../contexts/AuthContext';
import { LoginRequest, RegisterRequest } from '../types';

const AuthContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
`;

const AuthCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const AuthHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;

  h2 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
  }

  p {
    margin: 0;
    color: #6b7280;
    font-size: 0.9rem;
  }
`;

const AuthForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const AuthButton = styled.button<{ $primary?: boolean }>`
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$primary ? '#667eea' : '#f3f4f6'};
  color: ${props => props.$primary ? 'white' : '#374151'};

  &:hover {
    background: ${props => props.$primary ? '#5a67d8' : '#e5e7eb'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  border: 1px solid #fecaca;
`;

const HelperText = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
  margin-top: 0.25rem;

  strong {
    color: #374151;
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
    userType: 'rescue_staff',
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
          <Heading level="h2">{isLoginMode ? 'Rescue Staff Sign In' : 'Join Our Rescue Team'}</Heading>
          <Text>
            {isLoginMode ? 'Welcome back to the Rescue Management System' : 'Create your rescue staff account'}
          </Text>
        </AuthHeader>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {isLoginMode ? (
          <AuthForm onSubmit={handleLogin}>
            <FormGroup>
              <label htmlFor="email">Email Address</label>
              <Input
                id="email"
                type="email"
                value={loginForm.email}
                onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="Enter your email"
                required
              />
            </FormGroup>

            <FormGroup>
              <label htmlFor="password">Password</label>
              <Input
                id="password"
                type="password"
                value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="Enter your password"
                required
              />
            </FormGroup>

            <AuthButton type="submit" $primary disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </AuthButton>

            <HelperText>
              <strong>Rescue Staff Only:</strong> This app is for rescue organization staff. <br />
              Pet adopters should use the <strong>Client App</strong> (port 3000) <br />
              System admins should use the <strong>Admin App</strong> (port 3001)
            </HelperText>
          </AuthForm>
        ) : (
          <AuthForm onSubmit={handleRegister}>
            <FormRow>
              <FormGroup>
                <label htmlFor="firstName">First Name</label>
                <Input
                  id="firstName"
                  type="text"
                  value={registerForm.firstName}
                  onChange={e => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                  placeholder="First name"
                  required
                />
              </FormGroup>

              <FormGroup>
                <label htmlFor="lastName">Last Name</label>
                <Input
                  id="lastName"
                  type="text"
                  value={registerForm.lastName}
                  onChange={e => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                  placeholder="Last name"
                  required
                />
              </FormGroup>
            </FormRow>

            <FormGroup>
              <label htmlFor="email">Email Address</label>
              <Input
                id="email"
                type="email"
                value={registerForm.email}
                onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
                placeholder="Enter your email"
                required
              />
            </FormGroup>

            <FormGroup>
              <label htmlFor="phoneNumber">Phone Number</label>
              <Input
                id="phoneNumber"
                type="tel"
                value={registerForm.phoneNumber}
                onChange={e => setRegisterForm({ ...registerForm, phoneNumber: e.target.value })}
                placeholder="(555) 123-4567"
                required
              />
            </FormGroup>

            <FormGroup>
              <label htmlFor="password">Password</label>
              <Input
                id="password"
                type="password"
                value={registerForm.password}
                onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                placeholder="Choose a strong password"
                required
              />
              <HelperText>Password must be at least 8 characters</HelperText>
            </FormGroup>

            <FormGroup>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <Input
                id="confirmPassword"
                type="password"
                value={registerForm.confirmPassword}
                onChange={e => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                required
              />
            </FormGroup>

            <FormGroup>
              <label htmlFor="userType">Role:</label>
              <Select
                id="userType"
                value={registerForm.userType}
                onChange={e =>
                  setRegisterForm({
                    ...registerForm,
                    userType: e.target.value as 'rescue_staff',
                  })
                }
              >
                <option value="rescue_staff">Rescue Staff</option>
                <option value="rescue_manager">Rescue Manager</option>
                <option value="rescue_volunteer">Rescue Volunteer</option>
              </Select>
              <HelperText>
                Choose your role within the rescue organization
              </HelperText>
            </FormGroup>

            <AuthButton type="submit" $primary disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </AuthButton>
          </AuthForm>
        )}

        <AuthFooter>
          <AuthToggle
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError(null);
            }}
          >
            {isLoginMode ? "Need to create an account? Sign up" : "Already have an account? Sign in"}
          </AuthToggle>
        </AuthFooter>
      </AuthCard>
    </AuthContainer>
  );
};

export default AuthPage;
