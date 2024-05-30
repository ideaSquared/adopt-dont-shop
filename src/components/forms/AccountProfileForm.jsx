import React, { useState, useEffect } from 'react';
import AlertComponent from '../../components/common/AlertComponent';

const AccountProfileForm = ({ initialData, updateUserDetails }) => {
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		confirmPassword: '',
		firstName: '',
		lastName: '',
		city: '',
		country: '',
	});
	const [alert, setAlert] = useState({ message: null, type: null });

	useEffect(() => {
		setFormData({
			email: '',
			password: '',
			confirmPassword: '',
			firstName: '',
			lastName: '',
			city: '',
			country: 'United Kingdom',
			...initialData,
		});
	}, [initialData]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prevState) => ({
			...prevState,
			[name]: value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (formData.password && formData.password !== formData.confirmPassword) {
			setAlert({ message: 'Your passwords must match.', type: 'danger' });
			return;
		}

		if (formData.password && formData.password.length < 6) {
			setAlert({
				message: 'Password must be at least 6 characters long.',
				type: 'danger',
			});
			return;
		}

		try {
			const result = await updateUserDetails(formData);
			if (result.success) {
				setAlert({ message: 'Updated account successfully!', type: 'success' });
			} else {
				throw new Error(result.error || 'Failed to update details');
			}
		} catch (error) {
			setAlert({ message: error.message, type: 'danger' });
		}
	};

	return (
		<>
			{alert.message && (
				<AlertComponent
					type={alert.type}
					message={alert.message}
					onClose={() => setAlert({ message: null, type: null })}
				/>
			)}
			<form onSubmit={handleSubmit} className='space-y-6'>
				<div className='space-y-4'>
					<div>
						<label
							htmlFor='firstName'
							className='block text-sm font-medium text-gray-700'
						>
							First name
						</label>
						<input
							type='text'
							name='firstName'
							value={formData.firstName}
							onChange={handleChange}
							placeholder='Enter your first name'
							className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
						/>
					</div>
					<div>
						<label
							htmlFor='lastName'
							className='block text-sm font-medium text-gray-700'
						>
							Last name
						</label>
						<input
							type='text'
							name='lastName'
							value={formData.lastName}
							onChange={handleChange}
							placeholder='Enter your last name'
							className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
						/>
					</div>
					<div>
						<label
							htmlFor='email'
							className='block text-sm font-medium text-gray-700'
						>
							Email
						</label>
						<input
							type='email'
							name='email'
							value={formData.email}
							onChange={handleChange}
							placeholder='Enter your email'
							className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
						/>
					</div>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div>
							<label
								htmlFor='city'
								className='block text-sm font-medium text-gray-700'
							>
								City
							</label>
							<input
								type='text'
								name='city'
								value={formData.city || ''}
								onChange={handleChange}
								placeholder='Enter your city'
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							/>
						</div>
						<div>
							<label
								htmlFor='country'
								className='block text-sm font-medium text-gray-700'
							>
								Country
							</label>
							<select
								name='country'
								value={formData.country || 'United Kingdom'}
								onChange={handleChange}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value='United Kingdom'>United Kingdom</option>
								<option value='United States'>United States</option>
								<option value='Ireland'>Ireland</option>
								{/* Add more countries as needed */}
							</select>
						</div>
					</div>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div>
							<label
								htmlFor='password'
								className='block text-sm font-medium text-gray-700'
							>
								New password
							</label>
							<input
								type='password'
								name='password'
								value={formData.password}
								onChange={handleChange}
								placeholder='Enter your new password'
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							/>
						</div>
						<div>
							<label
								htmlFor='confirmPassword'
								className='block text-sm font-medium text-gray-700'
							>
								Confirm new password
							</label>
							<input
								type='password'
								name='confirmPassword'
								value={formData.confirmPassword}
								onChange={handleChange}
								placeholder='Confirm your new password'
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							/>
						</div>
					</div>
					<button
						type='submit'
						className='mt-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
					>
						Update my account
					</button>
				</div>
			</form>
		</>
	);
};

export default AccountProfileForm;
