import React, { useState } from 'react';
import CreateAccountForm from '../../components/forms/CreateAccountForm';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AlertComponent from '../../components/common/AlertComponent';
import { AlertType } from '../../components/common/AlertTypes'; // Adjust the path as necessary

interface AlertState {
  show: boolean;
  message: string;
  type: AlertType;
}

const CreateAccountPage: React.FC = () => {
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [alert, setAlert] = useState<AlertState>({ show: false, message: '', type: 'info' });
  const navigate = useNavigate();
  const { createUser } = useAuth();

  const handleCreateAccount = async () => {
    try {
      await createUser(firstName, lastName, email, password, city, country);
      navigate('/');
    } catch (error: any) {
      console.error('Create user account failed', error.response?.data);
      setAlert({
        show: true,
        message: 'Failed to create account. Please try again.',
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
          <CreateAccountForm
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onCreateAccount={handleCreateAccount}
            onCityChange={setCity}
            onCountryChange={setCountry}
            onConfirmPasswordChange={setConfirmPassword}
            password={password}
            confirmPassword={confirmPassword}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateAccountPage;
