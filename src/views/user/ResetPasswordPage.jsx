import React, { useState, useEffect } from 'react';
import ResetPasswordForm from '../../components/forms/ResetPasswordForm';
import AuthService from '../../services/AuthService';
import { useNavigate, useLocation } from 'react-router-dom';

const ResetPasswordPage = () => {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const navigate = useNavigate();
	const location = useLocation();

	const handleResetPassword = async () => {
		try {
			const response = await AuthService.resetPassword(token, password);
			console.log('Login successful', response.data);
			// Proceed to redirect the user or save the login state
			navigate('/');
		} catch (error) {
			console.error('Login failed', error.response.data);
		}
	};

	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const token = queryParams.get('token');
		if (!token) {
			alert('No token.');
		}
	}, [location]);

	return (
		<div>
			<ResetPasswordForm
				onPasswordChange={setPassword}
				onConfirmPasswordChange={setConfirmPassword}
				onResetPassword={handleResetPassword}
			/>
		</div>
	);
};

export default ResetPasswordPage;
