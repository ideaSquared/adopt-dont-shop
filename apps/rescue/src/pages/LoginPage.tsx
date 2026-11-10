import { AuthLayout, LoginForm, redirectTargetFromState } from '@adopt-dont-shop/lib.auth';
import { ManageCookiesLink } from '@adopt-dont-shop/lib.legal';
import { useLocation, useNavigate } from 'react-router';
import * as styles from './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSuccess = () => {
    navigate(redirectTargetFromState(location.state), { replace: true });
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
        showForgotPassword={true}
        onForgotPassword={() => navigate('/forgot-password')}
        helperText={
          <div className={styles.helperText}>
            <strong>Rescue Staff Only:</strong> This app is for rescue organization staff. <br />
            Pet adopters should use the <strong>Client App</strong>. <br />
            System admins should use the <strong>Admin App</strong>.
          </div>
        }
      />
    </AuthLayout>
  );
};

export default LoginPage;
