import { AuthLayout, RegisterForm } from '@adopt-dont-shop/lib-auth';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const HelperText = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme?.text?.secondary || '#6b7280'};
  line-height: 1.4;

  strong {
    color: ${props => props.theme?.text?.primary || '#374151'};
  }
`;

const RegisterPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/', { replace: true });
  };

  return (
    <AuthLayout title="Join Our Rescue Team" subtitle="Create your rescue staff account">
      <RegisterForm
        onSuccess={handleSuccess}
        requirePhoneNumber={true}
        termsUrl="/terms"
        privacyUrl="/privacy"
        helperText={
          <HelperText>
            <strong>Note:</strong> Registration creates a rescue staff account. You will need to be
            invited by your rescue organization administrator.
          </HelperText>
        }
      />
    </AuthLayout>
  );
};

export default RegisterPage;
