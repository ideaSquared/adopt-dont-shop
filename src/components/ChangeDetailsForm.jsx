// ChangeDetailsForm.js
import React, { useState } from 'react';
import AlertComponent from './AlertComponent';
import { useNavigate } from 'react-router-dom';

const ChangeDetailsForm = () => {
	const [formData, setFormData] = useState({ email: '', password: '' });
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
			if (!response.ok) throw new Error('Update failed');
			const data = await response.json();
			setAlert({ message: 'Details updated successfully!', type: 'success' });
			// Update UI or state as needed
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
