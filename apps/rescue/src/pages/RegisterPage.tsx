import { AuthLayout, RegisterForm } from '@adopt-dont-shop/lib.auth';
import { useNavigate } from 'react-router-dom';
import * as styles from './RegisterPage.css';

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
          <div className={styles.helperText}>
            <strong>Note:</strong> Registration creates a rescue staff account. You will need to be
            invited by your rescue organization administrator.
          </div>
        }
      />
    </AuthLayout>
  );
};

export default RegisterPage;
