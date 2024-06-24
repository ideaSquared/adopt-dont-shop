import React, { useState } from 'react';
import CreateRescueAccountForm from '../../components/forms/CreateRescueAccountForm';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AlertComponent from '../../components/common/AlertComponent';
import { AlertType } from '../../components/common/AlertTypes'; // Adjust the path as necessary

interface AlertState {
  show: boolean;
  message: string;
  type: AlertType;
}

const CreateRescueAccountPage: React.FC = () => {
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [rescueType, setRescueType] = useState<string>('individual');
  const [rescueName, setRescueName] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [addressLine1, setAddressLine1] = useState<string>('');
  const [addressLine2, setAddressLine2] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [county, setCounty] = useState<string>('');
  const [postcode, setPostcode] = useState<string>('');
  const [country, setCountry] = useState<string>('United Kingdom');
  const navigate = useNavigate();
  const [alert, setAlert] = useState<AlertState>({ show: false, message: '', type: 'info' });
  const { createRescue } = useAuth();

  const handleCreateRescueAccount = async () => {
    try {
      await createRescue(
        firstName,
        lastName,
        email,
        password,
        rescueType,
        rescueName,
        city,
        country,
        referenceNumber
      );
      navigate('/');
    } catch (error: any) {
      console.error('Create rescue account failed', error.response.data);
      setAlert({
        show: true,
        message: 'Failed to create rescue account. Please try again.',
        type: 'danger',
      });
    }
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, show: false });
  };

  return (
    <div className='flex justify-center items-center min-h-screen mt-2'>
      <div className='w-full max-w-md'>
        <div className='bg-light p-4 rounded shadow-md'>
          {alert.show && (
            <AlertComponent
              type={alert.type}
              message={alert.message}
              onClose={handleCloseAlert}
            />
          )}
          <CreateRescueAccountForm
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onRescueTypeChange={setRescueType}
            rescueType={rescueType}
            onRescueNameChange={setRescueName}
            onAddressLine1Change={setAddressLine1}
            onAddressLine2Change={setAddressLine2}
            onCityChange={setCity}
            onCountyChange={setCounty}
            onPostcodeChange={setPostcode}
            onCountryChange={setCountry}
            onCreateRescueAccount={handleCreateRescueAccount}
            onReferenceNumberChange={setReferenceNumber}
            password={password}
            confirmPassword={confirmPassword}
            countryValue={country}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateRescueAccountPage;
