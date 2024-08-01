import React from 'react';
import CountrySelect from '../inputs/CountrySelect';
import { Link } from 'react-router-dom';

interface CreateAccountFormProps {
	onFirstNameChange: (value: string) => void;
	onLastNameChange: (value: string) => void;
	onEmailChange: (value: string) => void;
	onPasswordChange: (value: string) => void;
	onCreateAccount: () => void;
	onCityChange: (value: string) => void;
	onCountryChange: (value: string) => void;
	onConfirmPasswordChange: (value: string) => void;
	password: string;
	confirmPassword: string;
}

const CreateAccountForm: React.FC<CreateAccountFormProps> = ({
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
}) => {
	const passwordsMatch =
		password && confirmPassword && password === confirmPassword;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				onCreateAccount();
			}}
			className='space-y-6 max-w-lg mx-auto'
		>
			<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
						onChange={(e) => onFirstNameChange(e.target.value)}
						placeholder='Enter first name'
						className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
						aria-required='true'
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
						onChange={(e) => onLastNameChange(e.target.value)}
						placeholder='Enter last name'
						className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
						aria-required='true'
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
					onChange={(e) => onEmailChange(e.target.value)}
					placeholder='Enter email'
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
					aria-required='true'
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
						onChange={(e) => onPasswordChange(e.target.value)}
						placeholder='Enter your password'
						className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
						aria-required='true'
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
						name='confirmPassword'
						onChange={(e) => onConfirmPasswordChange(e.target.value)}
						placeholder='Confirm your password'
						className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
							!passwordsMatch && confirmPassword ? 'border-red-500' : ''
						}`}
						aria-required='true'
					/>
					{!passwordsMatch && confirmPassword && (
						<p className='text-red-500 text-sm mt-1'>Passwords must match.</p>
					)}
				</div>
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
						onChange={(e) => onCityChange(e.target.value)}
						placeholder='Enter your city'
						className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
						aria-required='true'
					/>
				</div>
				<div className='space-y-2'>
					<label
						htmlFor='country'
						className='block text-sm font-medium text-gray-700'
					>
						Country
					</label>
					<CountrySelect onCountryChange={onCountryChange} />
				</div>
			</div>

			<div className='grid grid-cols-2 gap-4 mt-4'>
				<button
					type='submit'
					className='w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
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
