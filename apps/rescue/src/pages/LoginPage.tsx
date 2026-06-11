import { AuthLayout, LoginForm } from '@adopt-dont-shop/lib.auth';
import { ManageCookiesLink } from '@adopt-dont-shop/lib.legal';
import { useLocation, useNavigate } from 'react-router-dom';
import * as styles from './LoginPage.css';

type LocationState = {
  from?: { pathname?: string };
};

// Reject absolute URLs, protocol-relative (//), backslash variants (/\),
// and javascript: — only accept paths starting with a single `/`.
const isSafeRedirectPath = (value: string | null | undefined): value is string => {
  if (!value) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//') || value.startsWith('/\\')) return false;
  return true;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSuccess = () => {
    const state = location.state as LocationState | null;
    const rawRedirect = state?.from?.pathname;
    const redirectTo = isSafeRedirectPath(rawRedirect) ? rawRedirect : '/';
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
            Pet adopters should use the <strong>Client App</strong>. <br />
            System admins should use the <strong>Admin App</strong>.
          </div>
        }
      />
    </AuthLayout>
  );
};

export default LoginPage;
