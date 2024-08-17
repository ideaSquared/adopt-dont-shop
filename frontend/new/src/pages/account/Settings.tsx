import React, { useState, useEffect } from 'react';
import { User, UserService } from '@adoptdontshop/libs/users/';
import { Button, FormInput, TextInput } from '@adoptdontshop/components';
import { Form } from 'react-router-dom';

const Settings: React.FC = () => {
	const [user, setUser] = useState<User | undefined>(undefined);
	const [message, setMessage] = useState('');

	useEffect(() => {
		const currentUser = UserService.getUserById('1');
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
					<FormInput label='First name'>
						<TextInput
							type='text'
							value={user.first_name || ''}
							onChange={handleChange}
						/>
					</FormInput>
					<FormInput label='Last name'>
						<TextInput
							type='text'
							value={user.last_name || ''}
							onChange={handleChange}
						/>
					</FormInput>
					<FormInput label='Email'>
						<TextInput
							value={user.email || ''}
							onChange={handleChange}
							type='email'
						/>
					</FormInput>

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
