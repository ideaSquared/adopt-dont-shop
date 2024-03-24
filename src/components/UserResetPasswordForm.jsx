// ResetPasswordForm.js
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // Make sure you're using react-router-dom
import AlertComponent from './AlertComponent';
import { useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';

const ResetPasswordForm = () => {
	const location = useLocation(); // Use the useLocation hook to access the query params
	const [formData, setFormData] = useState({ token: '', newPassword: '' });
	const [alert, setAlert] = useState({ message: null, type: null });
	const navigate = useNavigate(); // Initialize useNavigate

	// Extract the token from the URL on component mount
	useEffect(() => {
		const queryParams = new URLSearchParams(location.search);
		const token = queryParams.get('token');
		if (token) {
			setFormData((prevState) => ({
				...prevState,
				token,
			}));
		} else {
			setAlert({ message: 'Token is missing or invalid.', type: 'danger' });
		}
	}, [location]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prevState) => ({
			...prevState,
			[name]: value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!formData.token) {
			setAlert({ message: 'Token is missing.', type: 'danger' });
			return;
		}

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_BASE_URL}/auth/reset-password`,
				{
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						token: formData.token,
						newPassword: formData.newPassword,
					}),
				}
			);
			const data = await response.json(); // Move this line outside the if condition
			if (!response.ok) {
				throw new Error(data.message || 'Reset password failed.');
			}

			setAlert({
				message:
					'Password has been reset successfully. You can now log in with your new password.',
				type: 'success',
			});
			navigate('/login');
		} catch (error) {
			setAlert({ message: error.message, type: 'danger' });
		}
	};

	return (
		<Container>
			<>
				<AlertComponent
					type={alert.type}
					message={alert.message}
					onClose={() => setAlert({ message: null, type: null })}
				/>
				<form onSubmit={handleSubmit}>
					<div className='mb-3'>
						<label htmlFor='newPassword' className='form-label'>
							New Password
						</label>
						<input
							type='password'
							className='form-control'
							id='newPassword'
							name='newPassword'
							value={formData.newPassword}
							onChange={handleChange}
						/>
					</div>
					<button type='submit' className='btn btn-primary'>
						Reset Password
					</button>
				</form>
			</>
		</Container>
	);
};

export default ResetPasswordForm;
