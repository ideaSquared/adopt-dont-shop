import { AuthLayout, LoginForm } from '@adopt-dont-shop/lib.auth';
import { ManageCookiesLink } from '@adopt-dont-shop/lib.legal';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as styles from './LoginPage.css';

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
        <>
          <div className={styles.registerPrompt}>
            <p>Need an admin account?</p>
            <Link to='/register'>Request access</Link>
          </div>
          <div className={styles.manageCookies}>
            <ManageCookiesLink />
          </div>
        </>
      }
    >
      <LoginForm
        onSuccess={handleSuccess}
        showForgotPassword={true}
        onForgotPassword={handleForgotPassword}
        helperText={
          <div className={styles.helperText}>
            <strong>Administrators Only:</strong> This app is for system administrators and
            moderators. <br />
            Pet adopters should use the <strong>Client App</strong> (port 3000) <br />
            Rescue staff should use the <strong>Rescue App</strong> (port 3002)
          </div>
        }
      />
    </AuthLayout>
  );
};
