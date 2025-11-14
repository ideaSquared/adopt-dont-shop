import { AuthLayout, RegisterForm } from '@adopt-dont-shop/lib.auth';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const LoginPrompt = styled.div`
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${props => props.theme.border.color.secondary};

  p {
    color: ${props => props.theme.text.secondary};
    margin-bottom: 0.5rem;
  }

  a {
    color: ${props => props.theme.colors.primary[600]};
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/', { replace: true });
  };

  return (
    <AuthLayout
      title='Create Your Account'
      subtitle='Join thousands of people who have found their perfect pet companion'
      footer={
        <LoginPrompt>
          <p>Already have an account?</p>
          <Link to='/login'>Sign in instead</Link>
        </LoginPrompt>
      }
    >
      <RegisterForm
        onSuccess={handleSuccess}
        requirePhoneNumber={false}
        termsUrl='/terms'
        privacyUrl='/privacy'
      />
    </AuthLayout>
  );
};
