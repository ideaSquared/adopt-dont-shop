// frontend/new/src/pages/user/ResetPassword.tsx
import React, { useState } from 'react';
import UserService from '@adoptdontshop/libs/users/UserService';
import { Button, TextInput } from '@adoptdontshop/components';

const ResetPassword: React.FC = () => {
	const [email, setEmail] = useState('');
	const [message, setMessage] = useState('');

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		const success = UserService.resetPassword(email);
		setMessage(success ? 'Password reset link sent!' : 'Email not found');
	};

	return (
		<div>
			<h1>Reset Password</h1>
			<form onSubmit={handleSubmit}>
				<TextInput
					label='Email'
					value={email}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setEmail(e.target.value)
					}
					type='email'
					required
				/>
				<Button type='submit'>Reset Password</Button>
			</form>
			{message && <p>{message}</p>}
		</div>
	);
};

export default ResetPassword;