import React, { useState } from 'react';
import LoginForm from '../../components/forms/LoginForm';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AlertComponent from '../../components/common/AlertComponent';

const LoginPage = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const navigate = useNavigate();
	const [alert, setAlert] = useState({ show: false, message: '', type: '' });
	const { login } = useAuth();

	const handleLogin = async () => {
		try {
			await login(email, password);
			navigate('/');
		} catch (error) {
			console.error('Login failed', error.message);
			setAlert({
				show: true,
				message: 'Failed to login. Please try again.',
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
					<LoginForm
						onEmailChange={setEmail}
						onPasswordChange={setPassword}
						onLogin={handleLogin}
					/>
				</div>
			</div>
		</div>
	);
};

export default LoginPage;
