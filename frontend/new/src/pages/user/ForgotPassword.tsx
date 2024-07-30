// frontend/new/src/pages/user/ForgotPassword.tsx
import React, { useState } from 'react';
import UserService from '@adoptdontshop/libs/users/UserService';
import { Button, FormInput, TextInput } from '@adoptdontshop/components';

const ForgotPassword: React.FC = () => {
	const [email, setEmail] = useState('');
	const [message, setMessage] = useState('');

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		const success = UserService.forgotPassword(email);
		setMessage(success ? 'Password reset link sent!' : 'Email not found');
	};

	return (
		<div>
			<h1>Forgot Password</h1>
			<form onSubmit={handleSubmit}>
				<FormInput label='Email'>
					<TextInput
						value={email}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setEmail(e.target.value)
						}
						type='email'
						required
					/>
				</FormInput>

				<Button type='submit'>Submit</Button>
			</form>
			{message && <p>{message}</p>}
		</div>
	);
};

export default ForgotPassword;
