// frontend/new/src/pages/user/Settings.tsx
import React, { useState, useEffect } from 'react';
import UserService from '@lib/users/UserService';
import { User } from '@lib/users/User';

const Settings: React.FC = () => {
	const [user, setUser] = useState<User | undefined>(undefined);
	const [message, setMessage] = useState('');

	useEffect(() => {
		// Simulate fetching the current logged-in user
		const currentUser = UserService.getUserById('1'); // Replace '1' with the actual user ID
		if (currentUser) {
			setUser(currentUser);
		}
	}, []);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target;
		if (user) {
			setUser({ ...user, [name]: value });
		}
	};

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		if (user) {
			const updatedUser = UserService.updateUser(user);
			setMessage(
				updatedUser ? 'Settings updated successfully!' : 'Update failed'
			);
		}
	};

	return (
		<div>
			<h1>Settings</h1>
			{user ? (
				<form onSubmit={handleSubmit}>
					<div>
						<label>First Name:</label>
						<input
							type='text'
							name='first_name'
							value={user.first_name}
							onChange={handleChange}
						/>
					</div>
					<div>
						<label>Last Name:</label>
						<input
							type='text'
							name='last_name'
							value={user.last_name}
							onChange={handleChange}
						/>
					</div>
					<div>
						<label>Email:</label>
						<input
							type='email'
							name='email'
							value={user.email}
							onChange={handleChange}
						/>
					</div>
					<button type='submit'>Save Settings</button>
				</form>
			) : (
				<p>Loading...</p>
			)}
			{message && <p>{message}</p>}
		</div>
	);
};

export default Settings;
