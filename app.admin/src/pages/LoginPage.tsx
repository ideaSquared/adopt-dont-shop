import { AuthLayout, LoginForm } from '@adopt-dont-shop/lib-auth';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const RegisterPrompt = styled.div`
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${props => props.theme?.border?.color?.primary || '#e5e7eb'};

  p {
    color: ${props => props.theme?.text?.secondary || '#6b7280'};
    margin-bottom: 0.5rem;
  }

  a {
    color: ${props => props.theme?.colors?.primary?.[500] || '#667eea'};
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
  margin-top: 0.5rem;

  strong {
    color: ${props => props.theme?.text?.primary || '#374151'};
  }
`;

export const LoginPage = () => {
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
      title='Admin Portal'
      subtitle='System administration and management'
      footer={
        <RegisterPrompt>
          <p>Need an admin account?</p>
          <Link to='/register'>Request access</Link>
        </RegisterPrompt>
      }
    >
      <LoginForm
        onSuccess={handleSuccess}
        showForgotPassword={true}
        onForgotPassword={handleForgotPassword}
        helperText={
          <HelperText>
            <strong>Administrators Only:</strong> This app is for system administrators and
            moderators. <br />
            Pet adopters should use the <strong>Client App</strong> (port 3000) <br />
            Rescue staff should use the <strong>Rescue App</strong> (port 3002)
          </HelperText>
        }
      />
    </AuthLayout>
  );
};
