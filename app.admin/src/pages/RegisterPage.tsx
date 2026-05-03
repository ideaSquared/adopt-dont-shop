import { AuthLayout, RegisterForm } from '@adopt-dont-shop/lib.auth';
import { Link, useNavigate } from 'react-router-dom';
import * as styles from './RegisterPage.css';

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
        <div className={styles.loginPrompt}>
          <p>Already have an account?</p>
          <Link to='/login'>Sign in</Link>
        </div>
      }
    >
      <RegisterForm
        onSuccess={handleSuccess}
        requirePhoneNumber={false}
        termsUrl='/terms'
        privacyUrl='/privacy'
        helperText={
          <div className={styles.helperText}>
            <strong>Note:</strong> Admin accounts require approval from existing administrators. You
            will be notified once your account is activated.
          </div>
        }
      />
    </AuthLayout>
  );
};
