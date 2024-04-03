import React, { useState } from 'react';
import ForgotPasswordForm from '../../components/forms/ForgotPasswordForm';
import AuthService from '../../services/AuthService';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordPage = () => {
	const [email, setEmail] = useState('');
	const navigate = useNavigate(); // Initialize useNavigate

	const handleForgotPassword = async () => {
		try {
			const response = await AuthService.sendForgotPasswordEmail(email);
			console.log('Login successful', response.data);
			// Proceed to redirect the user or save the login state
			navigate('/');
		} catch (error) {
			console.error('Login failed', error.response.data);
		}
	};

	return (
		<div>
			<ForgotPasswordForm
				onEmailChange={setEmail}
				onForgotPassword={handleForgotPassword}
			/>
		</div>
	);
};

export default ForgotPasswordPage;
