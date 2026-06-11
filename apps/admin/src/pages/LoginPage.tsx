import { AuthLayout, LoginForm } from '@adopt-dont-shop/lib.auth';
import { ManageCookiesLink } from '@adopt-dont-shop/lib.legal';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as styles from './LoginPage.css';

// Reject absolute URLs, protocol-relative (//), backslash variants (/\),
// and javascript: — only accept paths starting with a single `/`.
const isSafeRedirectPath = (value: string | null | undefined): value is string => {
  if (!value) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//') || value.startsWith('/\\')) return false;
  return true;
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const rawFrom = location.state?.from?.pathname;
  const from = isSafeRedirectPath(rawFrom) ? rawFrom : '/';

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
            Pet adopters should use the <strong>Client App</strong>. <br />
            Rescue staff should use the <strong>Rescue App</strong>.
          </div>
        }
      />
    </AuthLayout>
  );
};
