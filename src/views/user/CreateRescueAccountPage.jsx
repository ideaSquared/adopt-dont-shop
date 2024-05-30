import React, { useState } from 'react';
import CreateRescueAccountForm from '../../components/forms/CreateRescueAccountForm';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AlertComponent from '../../components/common/AlertComponent';

const CreateRescueAccountPage = () => {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [rescueType, setRescueType] = useState('individual');
	const [rescueName, setRescueName] = useState('');
	const [referenceNumber, setReferenceNumber] = useState('');
	const [city, setCity] = useState('');
	const [country, setCountry] = useState('United Kingdom');
	const navigate = useNavigate();
	const [alert, setAlert] = useState({ show: false, message: '', type: '' });
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
		} catch (error) {
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
						onRescueNameChange={setRescueName}
						onCityChange={setCity}
						onCountryChange={setCountry}
						onCreateRescueAccount={handleCreateRescueAccount}
						rescueType={rescueType}
						onReferenceNumberChange={setReferenceNumber}
						password={password}
						confirmPassword={confirmPassword}
					/>
				</div>
			</div>
		</div>
	);
};

export default CreateRescueAccountPage;
