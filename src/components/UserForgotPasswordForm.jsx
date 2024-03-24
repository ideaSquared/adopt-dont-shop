// ForgotPasswordForm.js
import React, { useState } from 'react';
import AlertComponent from './AlertComponent';
import { useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';

const ForgotPasswordForm = () => {
	const [email, setEmail] = useState('');
	const [alert, setAlert] = useState({ message: null, type: null });

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_BASE_URL}/auth/forgot-password`,
				{
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email }),
				}
			);
			if (!response.ok) {
				const errorData = await response.json(); // Attempt to parse error message from the server
				throw new Error(
					errorData.message || 'Failed to send password reset email.'
				);
			}

			const data = await response.json();
			setAlert({
				message: 'Successfully sent password reset email.',
				type: 'success',
			});
			// Optionally, clear the form or redirect
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
						<label htmlFor='email' className='form-label'>
							Email address
						</label>
						<input
							type='email'
							className='form-control'
							id='email'
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>
					<button type='submit' className='btn btn-primary'>
						Send Reset Email
					</button>
				</form>
			</>
		</Container>
	);
};

export default ForgotPasswordForm;
