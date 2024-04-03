import React, { useState } from 'react';
import LoginForm from '../../components/forms/LoginForm';
import AuthService from '../../services/AuthService';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const navigate = useNavigate(); // Initialize useNavigate

	const handleLogin = async () => {
		try {
			const response = await AuthService.login(email, password);
			console.log('Login successful', response.data);
			// Proceed to redirect the user or save the login state
			navigate('/');
		} catch (error) {
			console.error('Login failed', error.response.data);
		}
	};

	return (
		<div>
			<LoginForm
				onEmailChange={setEmail}
				onPasswordChange={setPassword}
				onLogin={handleLogin}
			/>
		</div>
	);
};

export default LoginPage;
