import { AuthLayout, LoginForm } from '@adopt-dont-shop/lib-auth';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const HelperText = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme?.text?.secondary || '#6b7280'};
  line-height: 1.4;
  margin-top: 0.5rem;

  strong {
    color: ${props => props.theme?.text?.primary || '#374151'};
  }
`;

const LoginPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/', { replace: true });
  };

  return (
    <AuthLayout
      title='Rescue Staff Sign In'
      subtitle='Welcome back to the Rescue Management System'
    >
      <LoginForm
        onSuccess={handleSuccess}
        showForgotPassword={false}
        helperText={
          <HelperText>
            <strong>Rescue Staff Only:</strong> This app is for rescue organization staff. <br />
            Pet adopters should use the <strong>Client App</strong> (port 3000) <br />
            System admins should use the <strong>Admin App</strong> (port 3001)
          </HelperText>
        }
      />
    </AuthLayout>
  );
};

export default LoginPage;
