// ChangeDetailsForm.js
import React, { useState } from 'react';
import AlertComponent from './AlertComponent';
import { useNavigate } from 'react-router-dom';

const ChangeDetailsForm = () => {
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		firstName: '',
	});
	const [alert, setAlert] = useState({ message: null, type: null });
	const token = localStorage.getItem('token'); // Assuming the token is stored in localStorage
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
				`${import.meta.env.VITE_API_BASE_URL}/auth/details`,
				{
					method: 'PUT',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(formData),
				}
			);

			const data = await response.json(); // Parse response body first
			if (!response.ok) {
				throw new Error(data.message || 'Failed to update details.'); // Use server-provided message if available
			}

			setAlert({ message: 'Details updated successfully!', type: 'success' });
		} catch (error) {
			setAlert({ message: error.message, type: 'danger' });
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
					<label htmlFor='firstName' className='form-label'>
						New First Name
					</label>
					<input
						type='text'
						className='form-control'
						id='firstName'
						name='firstName'
						value={formData.firstName}
						onChange={handleChange}
					/>
				</div>
				<div className='mb-3'>
					<label htmlFor='email' className='form-label'>
						New Email
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
						New Password
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
					Update Details
				</button>
			</form>
		</>
	);
};

export default ChangeDetailsForm;
