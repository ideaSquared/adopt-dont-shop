// CreateAccount.js
import React, { useState } from 'react';
import AlertComponent from './AlertComponent';
import { useNavigate } from 'react-router-dom';

const CreateAccount = () => {
	const [formData, setFormData] = useState({ email: '', password: '' });
	const [alert, setAlert] = useState({ message: null, type: null });
	const navigate = useNavigate(); // Initialize useNavigate

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prevState) => ({
			...prevState,
			[name]: value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_BASE_URL}/auth/register`,
				{
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(formData),
				}
			);

			// First, check if the response is OK (status in the range 200-299)
			if (response.ok) {
				const data = await response.json();
				setAlert({ message: 'Registration successful!', type: 'success' });
				// Redirect user or clear form
				navigate('/login');
			} else {
				// If response is not ok, try to parse the error message from the response body
				const errorData = await response.json();
				const errorMessage = errorData.message || 'Registration failed';
				setAlert({ message: errorMessage, type: 'danger' });
			}
		} catch (error) {
			// Handle network error or other unexpected errors
			setAlert({
				message: error.message || 'An unexpected error occurred',
				type: 'danger',
			});
		}
	};

	return (
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
						name='email'
						value={formData.email}
						onChange={handleChange}
					/>
				</div>
				<div className='mb-3'>
					<label htmlFor='password' className='form-label'>
						Password
					</label>
					<input
						type='password'
						className='form-control'
						id='password'
						name='password'
						value={formData.password}
						onChange={handleChange}
					/>
				</div>
				<button type='submit' className='btn btn-primary'>
					Create Account
				</button>
			</form>
		</>
	);
};

export default CreateAccount;
