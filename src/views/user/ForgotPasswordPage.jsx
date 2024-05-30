import React, { useState } from 'react';
import ForgotPasswordForm from '../../components/forms/ForgotPasswordForm';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AlertComponent from '../../components/common/AlertComponent';

const ForgotPasswordPage = () => {
	const [email, setEmail] = useState('');
	const navigate = useNavigate();
	const [alert, setAlert] = useState({ show: false, message: '', type: '' });
	const { sendForgotPasswordEmail } = useAuth();

	const handleForgotPassword = async () => {
		try {
			await sendForgotPasswordEmail(email);
			setAlert({
				show: true,
				message:
					"We've sent an email to you to reset your password, please check your emails.",
				type: 'info',
			});
		} catch (error) {
			console.error('Failed to send reset password email', error);
			setAlert({
				show: true,
				message: 'Failed to reset your password. Please try again.',
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
					<ForgotPasswordForm
						onEmailChange={setEmail}
						onForgotPassword={handleForgotPassword}
					/>
				</div>
			</div>
		</div>
	);
};

export default ForgotPasswordPage;
