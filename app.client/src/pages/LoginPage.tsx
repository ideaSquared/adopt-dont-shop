import { AuthLayout, LoginForm } from '@adopt-dont-shop/lib.auth';
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const SignupPrompt = styled.div`
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${props => props.theme.border.color.primary};

  p {
    color: ${props => props.theme.text.secondary};
    margin-bottom: 0.5rem;
  }

  a {
    color: ${props => props.theme.colors.primary[500]};
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSuccess = () => {
    navigate(from, { replace: true });
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <AuthLayout
      title='Welcome Back'
      subtitle='Sign in to your account to continue your adoption journey'
      footer={
        <SignupPrompt>
          <p>Don&apos;t have an account?</p>
          <Link to='/register'>Create a new account</Link>
        </SignupPrompt>
      }
    >
      <LoginForm
        onSuccess={handleSuccess}
        showForgotPassword={true}
        onForgotPassword={handleForgotPassword}
      />
    </AuthLayout>
  );
};
