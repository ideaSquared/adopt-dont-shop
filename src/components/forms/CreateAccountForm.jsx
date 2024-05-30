import React, { useState } from 'react';
import CountrySelect from '../inputs/CountrySelect';
import { Link } from 'react-router-dom';

const CreateAccountForm = ({
	onFirstNameChange,
	onLastNameChange,
	onEmailChange,
	onPasswordChange,
	onCreateAccount,
	onCityChange,
	onCountryChange,
	onConfirmPasswordChange,
	password,
	confirmPassword,
	countryValue,
}) => {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [city, setCity] = useState('');
	const [formValid, setFormValid] = useState(false);

	const passwordsMatch =
		password && confirmPassword && password === confirmPassword;

	const handleInputChange = (setter, validator, value) => {
		setter(value);
		validator(value);
	};

	const validateForm = () => {
		const isValid = firstName && lastName && email && city && passwordsMatch;
		setFormValid(isValid);
	};

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				if (formValid) {
					onCreateAccount();
				}
			}}
			className='space-y-6 max-w-lg mx-auto'
		>
			<div className='space-y-2'>
				<label
					htmlFor='firstName'
					className='block text-sm font-medium text-gray-700'
				>
					First name
				</label>
				<input
					type='text'
					name='firstName'
					onChange={(e) =>
						handleInputChange(setFirstName, onFirstNameChange, e.target.value)
					}
					onBlur={validateForm}
					placeholder='Enter first name'
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
					required
					aria-label='First name'
				/>
			</div>
			<div className='space-y-2'>
				<label
					htmlFor='lastName'
					className='block text-sm font-medium text-gray-700'
				>
					Last name
				</label>
				<input
					type='text'
					name='lastName'
					onChange={(e) =>
						handleInputChange(setLastName, onLastNameChange, e.target.value)
					}
					onBlur={validateForm}
					placeholder='Enter last name'
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
					required
					aria-label='Last name'
				/>
			</div>
			<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
				<div className='space-y-2'>
					<label
						htmlFor='city'
						className='block text-sm font-medium text-gray-700'
					>
						City
					</label>
					<input
						type='text'
						name='city'
						onChange={(e) =>
							handleInputChange(setCity, onCityChange, e.target.value)
						}
						onBlur={validateForm}
						placeholder='Enter city'
						className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
						required
						aria-label='City'
					/>
				</div>
				<div className='space-y-2'>
					<label
						htmlFor='country'
						className='block text-sm font-medium text-gray-700'
					>
						Country
					</label>
					<CountrySelect
						onCountryChange={onCountryChange}
						countryValue={countryValue}
					/>
				</div>
			</div>
			<div className='space-y-2'>
				<label
					htmlFor='email'
					className='block text-sm font-medium text-gray-700'
				>
					Email address
				</label>
				<input
					type='email'
					name='email'
					onChange={(e) =>
						handleInputChange(setEmail, onEmailChange, e.target.value)
					}
					onBlur={validateForm}
					placeholder='Enter email'
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
					required
					aria-label='Email address'
				/>
			</div>
			<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
				<div className='space-y-2'>
					<label
						htmlFor='password'
						className='block text-sm font-medium text-gray-700'
					>
						Password
					</label>
					<input
						type='password'
						name='password'
						onChange={(e) =>
							handleInputChange(null, onPasswordChange, e.target.value)
						}
						onBlur={validateForm}
						placeholder='Enter your password'
						className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
						required
						aria-label='Password'
					/>
				</div>
				<div className='space-y-2'>
					<label
						htmlFor='confirmPassword'
						className='block text-sm font-medium text-gray-700'
					>
						Confirm Password
					</label>
					<input
						type='password'
						onChange={(e) =>
							handleInputChange(null, onConfirmPasswordChange, e.target.value)
						}
						onBlur={validateForm}
						placeholder='Confirm your password'
						className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
							!passwordsMatch && confirmPassword ? 'border-red-500' : ''
						}`}
						required
						aria-label='Confirm Password'
					/>
					{!passwordsMatch && confirmPassword && (
						<p className='text-red-500 text-sm mt-1'>Passwords must match.</p>
					)}
				</div>
			</div>
			<div className='grid grid-cols-2 gap-4 mt-4'>
				<button
					type='submit'
					disabled={!formValid}
					className={`w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
						formValid
							? 'bg-blue-600 hover:bg-blue-700 focus:ring-indigo-500'
							: 'bg-gray-400 cursor-not-allowed'
					} focus:outline-none focus:ring-2 focus:ring-offset-2`}
				>
					Create Account
				</button>
				<Link
					to='/create-rescue-account'
					className='w-full flex items-center justify-center text-sm text-blue-600 hover:text-blue-700'
				>
					Are you a rescue?
				</Link>
			</div>
		</form>
	);
};

export default CreateAccountForm;
