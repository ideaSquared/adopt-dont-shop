import React, { useState, useEffect } from 'react';
import ResetPasswordForm from '../../components/forms/ResetPasswordForm';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ResetPasswordPage = () => {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [token, setToken] = useState('');
	const navigate = useNavigate();
	const location = useLocation();
	const { resetPassword } = useAuth();

	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const token = queryParams.get('token');
		if (token) {
			setToken(token);
		} else {
			alert('No token provided.');
		}
	}, [location]);

	const handleResetPassword = async () => {
		if (password !== confirmPassword) {
			alert("Passwords don't match");
			return;
		}
		try {
			const response = await resetPassword(token, password);
			console.log('Reset password successful', response.data);
			navigate('/');
		} catch (error) {
			console.error('Reset password failed', error.response.data);
		}
	};

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
