// frontend/new/src/pages/user/ForgotPassword.tsx
import React, { useState } from 'react';
import UserService from '@lib/users/UserService';

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
				<div>
					<label>Email:</label>
					<input
						type='email'
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
				</div>
				<button type='submit'>Submit</button>
			</form>
			{message && <p>{message}</p>}
		</div>
	);
};

export default ForgotPassword;
