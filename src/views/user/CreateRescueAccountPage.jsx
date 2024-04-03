import React, { useState } from 'react';
import CreateRescueAccountForm from '../../components/forms/CreateRescueAccountForm';
import AuthService from '../../services/AuthService';
import { useNavigate } from 'react-router-dom';

const CreateRescueAccountPage = () => {
	const [firstName, setFirstName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [rescueType, setRescueType] = useState('individual');
	const [rescueName, setRescueName] = useState('');
	const [rescueAddress, setRescueAddress] = useState('');
	const navigate = useNavigate(); // Initialize useNavigate

	const handleCreateRescueAccount = async () => {
		try {
			const response = await AuthService.createAccountRescue(
				firstName,
				email,
				password,
				rescueType,
				rescueName,
				rescueAddress
			);
			console.log('Create user account successful', response.data);
			// Proceed to redirect the user or save the login state
			navigate('/');
		} catch (error) {
			console.error('Create user account failed', error.response.data);
		}
	};

	return (
		<div>
			<CreateRescueAccountForm
				onFirstNameChange={setFirstName}
				onEmailChange={setEmail}
				onPasswordChange={setPassword}
				onRescueTypeChange={setRescueType}
				onRescueNameChange={setRescueName}
				onRescueAddressChange={setRescueAddress}
				onCreateRescueAccount={handleCreateRescueAccount}
			/>
		</div>
	);
};

export default CreateRescueAccountPage;
