import { AuthLayout, LoginForm } from '@adopt-dont-shop/lib.auth';
import { ManageCookiesLink } from '@adopt-dont-shop/lib.legal';
import { useLocation, useNavigate } from 'react-router-dom';
import * as styles from './LoginPage.css';

type LocationState = {
  from?: { pathname?: string };
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSuccess = () => {
    const state = location.state as LocationState | null;
    const redirectTo = state?.from?.pathname ?? '/';
    navigate(redirectTo, { replace: true });
  };

  return (
    <AuthLayout
      title="Rescue Staff Sign In"
      subtitle="Welcome back to the Rescue Management System"
      footer={
        <div className={styles.manageCookies}>
          <ManageCookiesLink />
        </div>
      }
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
