import React, { useState } from 'react';
import LoginForm from '../../components/forms/LoginForm';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AlertComponent from '../../components/common/AlertComponent';
import { AlertType } from '../../components/common/AlertTypes'; // Adjust the path as necessary

interface AlertState {
  show: boolean;
  message: string;
  type: AlertType;
}

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const navigate = useNavigate();
  const [alert, setAlert] = useState<AlertState>({ show: false, message: '', type: 'info' });
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      await login(email, password);
      navigate('/');
    } catch (error: any) {
      console.error('Login failed', error.message);
      setAlert({
        show: true,
        message: 'Failed to login. Please try again.',
        type: 'danger',
      });
    }
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, show: false });
  };

  return (
    <div className='flex justify-center items-center min-h-screen'>
      <div className='w-full max-w-md'>
        <div className='bg-light p-4 rounded shadow-md'>
          {alert.show && (
            <AlertComponent
              type={alert.type}
              message={alert.message}
              onClose={handleCloseAlert}
            />
          )}
          <LoginForm
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onLogin={handleLogin}
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
