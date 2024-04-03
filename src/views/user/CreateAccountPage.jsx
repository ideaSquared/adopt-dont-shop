import React, { useState } from 'react';
import CreateAccountForm from '../../components/forms/CreateAccountForm';
import AuthService from '../../services/AuthService';
import { useNavigate } from 'react-router-dom';

const CreateAccountPage = () => {
	const [firstName, setFirstName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const navigate = useNavigate(); // Initialize useNavigate

	const handleCreateAccount = async () => {
		try {
			const response = await AuthService.createAccountUser(
				firstName,
				email,
				password
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
			<CreateAccountForm
				onFirstNameChange={setFirstName}
				onEmailChange={setEmail}
				onPasswordChange={setPassword}
				onCreateAccount={handleCreateAccount}
			/>
		</div>
	);
};

export default CreateAccountPage;
