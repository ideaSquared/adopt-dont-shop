import React, { useState } from 'react';
import UserService from '@lib/users/UserService';
import { User } from '@lib/users/User';

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
				<div>
					<label>First Name:</label>
					<input
						type='text'
						value={firstName}
						onChange={(e) => setFirstName(e.target.value)}
					/>
				</div>
				<div>
					<label>Last Name:</label>
					<input
						type='text'
						value={lastName}
						onChange={(e) => setLastName(e.target.value)}
					/>
				</div>
				<div>
					<label>Email:</label>
					<input
						type='email'
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
				</div>
				<div>
					<label>Password:</label>
					<input
						type='password'
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
				</div>
				<div>
					<label>Confirm Password:</label>
					<input
						type='password'
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
					/>
				</div>
				{isRescueForm && (
					<>
						<div>
							<label>Rescue Type:</label>
							<select
								value={rescueType}
								onChange={(e) => setRescueType(e.target.value)}
							>
								<option value=''>Select a type</option>
								<option value='charity'>Charity</option>
								<option value='company'>Company</option>
								<option value='individual'>Individual</option>
								<option value='other'>Other</option>
							</select>
						</div>
						{(rescueType === 'charity' || rescueType === 'company') && (
							<>
								<div>
									<label>Rescue Name:</label>
									<input
										type='text'
										value={rescueName}
										onChange={(e) => setRescueName(e.target.value)}
									/>
								</div>
								<div>
									<label>
										{rescueType === 'charity'
											? 'Charity Number'
											: 'Company Number'}
									</label>
									<input
										type='text'
										value={referenceNumber}
										onChange={(e) => setReferenceNumber(e.target.value)}
									/>
								</div>
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
						<div>
							<label>City:</label>
							<input
								type='text'
								value={city}
								onChange={(e) => setCity(e.target.value)}
							/>
						</div>
						<div>
							<label>Country:</label>
							<input
								type='text'
								value={country}
								onChange={(e) => setCountry(e.target.value)}
							/>
						</div>
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
