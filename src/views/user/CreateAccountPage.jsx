import React, { useState } from 'react';
import CreateAccountForm from '../../components/forms/CreateAccountForm';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AlertComponent from '../../components/common/AlertComponent';

const CreateAccountPage = () => {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [city, setCity] = useState('');
	const [country, setCountry] = useState('');
	const [alert, setAlert] = useState({ show: false, message: '', type: '' });
	const navigate = useNavigate();
	const { createUser } = useAuth();

	const handleCreateAccount = async () => {
		try {
			await createUser(firstName, lastName, email, password, city, country);
			navigate('/');
		} catch (error) {
			console.error('Create user account failed', error.response.data);
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
