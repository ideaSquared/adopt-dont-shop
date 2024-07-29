import React, { useState, useEffect } from 'react';
import UserService from '@adoptdontshop/libs/users/UserService';
import { User } from '@adoptdontshop/libs/users/User';
import { Button, TextInput } from '@adoptdontshop/components';

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
					<TextInput
						label='First name'
						value={user.first_name || ''}
						onChange={handleChange}
					/>
					<TextInput
						label='Last name'
						value={user.last_name || ''}
						onChange={handleChange}
					/>
					<TextInput
						label='Email'
						value={user.email || ''}
						onChange={handleChange}
						type='email'
					/>
					<Button type='submit'>Save Settings</Button>
				</form>
			) : (
				<p>Loading...</p>
			)}
			{message && <p>{message}</p>}
		</div>
	);
};

export default Settings;
