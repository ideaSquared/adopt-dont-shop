import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LazyImage from '../LazyImage';
import CountrySelect from '../inputs/CountrySelect';

const CreateRescueAccountForm = ({
	onFirstNameChange,
	onLastNameChange,
	onEmailChange,
	onPasswordChange,
	onConfirmPasswordChange,
	onRescueTypeChange,
	rescueType,
	onRescueNameChange,
	onAddressLine1Change,
	onAddressLine2Change,
	onCityChange,
	onCountyChange,
	onPostcodeChange,
	onCountryChange,
	onCreateRescueAccount,
	onReferenceNumberChange,
	password,
	confirmPassword,
	countryValue,
}) => {
	const [selectedType, setSelectedType] = useState('');

	const passwordsMatch =
		password && confirmPassword && password === confirmPassword;

	const selectRescueType = (type) => {
		setSelectedType(type);
		onRescueTypeChange(type);
	};

	const isSelected = (type) =>
		selectedType === type ? 'bg-cyan-300 text-white' : 'bg-white text-gray-700';

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				onCreateRescueAccount();
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

			<hr />

			<div className='grid grid-cols-1 md:grid-cols-4 gap-4 text-center'>
				{['individual', 'charity', 'company', 'other'].map((type) => (
					<button
						key={type}
						type='button'
						className={`block w-full h-full border border-gray-300 rounded-md p-4 ${isSelected(
							type
						)}`}
						onClick={() => selectRescueType(type)}
					>
						<LazyImage
							src={`/undraw/undraw_${
								type === 'individual'
									? 'personal_file_re_5joy'
									: type === 'charity'
									? 'gifts_0ceh'
									: type === 'company'
									? 'businesswoman_re_5n6b'
									: 'questions_re_1fy7'
							}.svg`}
							alt={type.charAt(0).toUpperCase() + type.slice(1)}
							className='w-3/4 mx-auto mb-2'
						/>
						<p>{type.charAt(0).toUpperCase() + type.slice(1)}</p>
					</button>
				))}
			</div>

			{(rescueType === 'charity' || rescueType === 'company') && (
				<div className='space-y-4'>
					<div className='space-y-2'>
						<label
							htmlFor='rescueName'
							className='block text-sm font-medium text-gray-700'
						>
							Rescue name
						</label>
						<input
							type='text'
							name='rescueName'
							onChange={(e) => onRescueNameChange(e.target.value)}
							placeholder='Enter rescue name'
							className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							aria-required='true'
						/>
					</div>
					<div className='space-y-2'>
						<label
							htmlFor='referenceNumber'
							className='block text-sm font-medium text-gray-700'
						>
							{selectedType === 'charity'
								? 'Charity number'
								: selectedType === 'company'
								? 'Company number'
								: 'Reference number'}
						</label>
						<input
							type='text'
							name='referenceNumber'
							onChange={(e) => onReferenceNumberChange(e.target.value)}
							placeholder='Enter reference number'
							className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							aria-required='true'
						/>
						<p className='text-gray-500 text-sm mt-1'>
							Please enter the reference number as it appears in official
							records.{' '}
							{selectedType === 'charity' ? (
								<a
									href='https://register-of-charities.charitycommission.gov.uk/charity-search/'
									className='text-blue-500 underline'
								>
									Find it on the Charity Register.
								</a>
							) : selectedType === 'company' ? (
								<a
									href='https://find-and-update.company-information.service.gov.uk/'
									className='text-blue-500 underline'
								>
									Find it on Company House.
								</a>
							) : null}
						</p>
					</div>
				</div>
			)}

			{rescueType === 'other' && (
				<div className='my-4 p-4 bg-gray-100 rounded-md text-center'>
					<h4 className='text-gray-700'>
						I'm afraid we don't currently support other types of rescues - email
						us at help@adoptdontshop.app
					</h4>
				</div>
			)}

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
						placeholder='Enter your rescues city'
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
					<CountrySelect
						onCountryChange={onCountryChange}
						countryValue={countryValue}
					/>
				</div>
			</div>

			<div className='grid grid-cols-2 gap-4 mt-4'>
				<button
					type='submit'
					className='w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
				>
					Create Rescue Account
				</button>
				<Link
					to='/create-account'
					className='w-full flex items-center justify-center text-sm text-blue-600 hover:text-blue-700'
				>
					Are you not a rescue?
				</Link>
			</div>
		</form>
	);
};

export default CreateRescueAccountForm;
