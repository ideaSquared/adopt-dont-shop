import React, { useState } from 'react';
import UserService from '@lib/users/UserService';
import { User } from '@lib/users/User';
import TextInput from '@components/form/TextInput';
import SelectInput from '@components/form/SelectInput';

const CreateAccount: React.FC = () => {
	const [isRescueForm, setIsRescueForm] = useState(false);
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [rescueType, setRescueType] = useState('');
	const [rescueName, setRescueName] = useState('');
	const [city, setCity] = useState('');
	const [country, setCountry] = useState('');
	const [referenceNumber, setReferenceNumber] = useState('');
	const [message, setMessage] = useState('');

	const handleUserSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		const newUser: Omit<User, 'user_id'> = {
			first_name: firstName,
			last_name: lastName,
			email,
		};
		const user = UserService.createAccount(newUser);
		setMessage(`User registered with ID: ${user.user_id}`);
	};

	const handleRescueSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		if (rescueType === 'other') {
			setMessage("We don't support other types of rescues.");
			return;
		}
		const newUser: Omit<User, 'user_id'> = {
			first_name: firstName,
			last_name: lastName,
			email,
		};
		const user = UserService.createAccount(newUser);
		setMessage(`Rescue registered with ID: ${user.user_id}`);
	};

	return (
		<div>
			<h1>{isRescueForm ? 'Create Rescue Account' : 'Create User Account'}</h1>
			<form onSubmit={isRescueForm ? handleRescueSubmit : handleUserSubmit}>
				<TextInput
					label='First name'
					value={firstName}
					onChange={(e) => setFirstName(e.target.value)}
					required
				/>
				<TextInput
					label='Last name'
					value={lastName}
					onChange={(e) => setLastName(e.target.value)}
					required
				/>
				<TextInput
					label='Email'
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					type='email'
					required
				/>
				<TextInput
					label='Password'
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					type='password'
					required
				/>
				<TextInput
					label='Confirm password'
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					type='password'
					required
				/>

				{isRescueForm && (
					<>
						<SelectInput
							label='Rescue Type'
							value={rescueType}
							onChange={(e) => setRescueType(e.target.value)}
							options={[
								{ value: 'charity', label: 'Charity' },
								{ value: 'company', label: 'Company' },
								{ value: 'individual', label: 'Individual' },
								{ value: 'other', label: 'Other' },
							]}
						/>
						{(rescueType === 'charity' || rescueType === 'company') && (
							<>
								<TextInput
									label='Rescue Name'
									value={rescueName}
									onChange={(e) => setRescueName(e.target.value)}
								/>
								<TextInput
									label={
										rescueType === 'charity'
											? 'Charity number'
											: 'Company number'
									}
									value={referenceNumber}
									onChange={(e) => setReferenceNumber(e.target.value)}
								/>
								<p>
									Please enter the reference number as it appears in official
									records.{' '}
									{rescueType === 'charity' ? (
										<a href='https://register-of-charities.charitycommission.gov.uk/charity-search/'>
											Find it on the Charity Register.
										</a>
									) : (
										<a href='https://find-and-update.company-information.service.gov.uk/'>
											Find it on Company House.
										</a>
									)}
								</p>
							</>
						)}
						{rescueType === 'other' && (
							<div>
								<p>
									I'm afraid we don't currently support other types of rescues -
									email us at help@adoptdontshop.app
								</p>
							</div>
						)}
						<TextInput
							label='City'
							value={city}
							onChange={(e) => setCity(e.target.value)}
						/>
						<TextInput
							label='Country'
							value={country}
							onChange={(e) => setCountry(e.target.value)}
						/>
					</>
				)}
				<button type='submit'>
					{isRescueForm ? 'Create Rescue Account' : 'Create User Account'}
				</button>
			</form>
			{message && <p>{message}</p>}
			<p>
				{isRescueForm ? 'Not a rescue?' : 'Are you a rescue?'}{' '}
				<button onClick={() => setIsRescueForm(!isRescueForm)}>
					{isRescueForm ? 'Create User Account' : 'Create Rescue Account'}
				</button>
			</p>
		</div>
	);
};

export default CreateAccount;
