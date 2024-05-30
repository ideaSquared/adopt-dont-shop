import React, { useState, useEffect } from 'react';
import ResetPasswordForm from '../../components/forms/ResetPasswordForm';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AlertComponent from '../../components/common/AlertComponent';

const ResetPasswordPage = () => {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [token, setToken] = useState('');
	const navigate = useNavigate();
	const location = useLocation();
	const [alert, setAlert] = useState({ show: false, message: '', type: '' });
	const { resetPassword } = useAuth();

	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const token = queryParams.get('token');
		if (token) {
			setToken(token);
		} else {
			setAlert({ ...alert, show: false });
		}
	}, [location]);

	const handleResetPassword = async () => {
		if (password !== confirmPassword) {
			alert("Passwords don't match");
			return;
		}
		try {
			const response = await resetPassword(token, password);
			navigate('/login');
		} catch (error) {
			console.error('Reset password failed', error.response.data);
			setAlert({
				show: true,
				message: 'Failed to reset password. Please try again.',
				type: 'danger',
			});
		}
	};

	const handleCloseAlert = () => {
		setAlert({ ...alert, show: false });
	};

	return (
		<div className='flex items-center justify-center min-h-screen'>
			<div className='w-full max-w-md bg-white shadow-md rounded-lg p-6'>
				{alert.show && (
					<AlertComponent
						type={alert.type}
						message={alert.message}
						onClose={handleCloseAlert}
					/>
				)}
				<div className='justify-center'>
					<ResetPasswordForm
						onPasswordChange={setPassword}
						onConfirmPasswordChange={setConfirmPassword}
						onResetPassword={handleResetPassword}
					/>
				</div>
			</div>
		</div>
	);
};

export default ResetPasswordPage;
