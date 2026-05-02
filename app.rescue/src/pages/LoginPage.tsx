import { AuthLayout, LoginForm } from '@adopt-dont-shop/lib.auth';
import { useNavigate } from 'react-router-dom';
import * as styles from './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/', { replace: true });
  };

  return (
    <AuthLayout
      title="Rescue Staff Sign In"
      subtitle="Welcome back to the Rescue Management System"
    >
      <LoginForm
        onSuccess={handleSuccess}
        showForgotPassword={false}
        helperText={
          <div className={styles.helperText}>
            <strong>Rescue Staff Only:</strong> This app is for rescue organization staff. <br />
            Pet adopters should use the <strong>Client App</strong> (port 3000) <br />
            System admins should use the <strong>Admin App</strong> (port 3001)
          </div>
        }
      />
    </AuthLayout>
  );
};

export default LoginPage;
