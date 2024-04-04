import React, { useState } from 'react';
import LoginForm from '../../components/forms/LoginForm';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const navigate = useNavigate(); // Initialize useNavigate
	const { login } = useAuth(); // Destructure the login method from useAuth

	const handleLogin = async () => {
		try {
			// Use the login method from AuthContext
			await login(email, password);
			console.log('Login successful');
			// Redirect the user after successful login
			navigate('/');
		} catch (error) {
			// Handle errors as per your AuthContext's error handling logic
			// Assuming error message is available as error.message
			console.error('Login failed', error.message);
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
