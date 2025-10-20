import { AuthLayout, RegisterForm } from '@adopt-dont-shop/lib-auth';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const LoginPrompt = styled.div`
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${props => props.theme?.border?.color?.secondary || '#e5e7eb'};

  p {
    color: ${props => props.theme?.text?.secondary || '#6b7280'};
    margin-bottom: 0.5rem;
  }

  a {
    color: ${props => props.theme?.colors?.primary?.[600] || '#667eea'};
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const HelperText = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme?.text?.secondary || '#6b7280'};
  line-height: 1.4;

  strong {
    color: ${props => props.theme?.text?.primary || '#374151'};
  }
`;

export const RegisterPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/', { replace: true });
  };

  return (
    <AuthLayout
      title='Request Admin Access'
      subtitle='Create administrator account'
      footer={
        <LoginPrompt>
          <p>Already have an account?</p>
          <Link to='/login'>Sign in</Link>
        </LoginPrompt>
      }
    >
      <RegisterForm
        onSuccess={handleSuccess}
        requirePhoneNumber={false}
        termsUrl='/terms'
        privacyUrl='/privacy'
        helperText={
          <HelperText>
            <strong>Note:</strong> Admin accounts require approval from existing administrators.
            You will be notified once your account is activated.
          </HelperText>
        }
      />
    </AuthLayout>
  );
};
