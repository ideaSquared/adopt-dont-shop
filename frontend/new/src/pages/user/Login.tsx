import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import UserService from '@lib/users/UserService';

const Login: React.FC = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [message, setMessage] = useState('');

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		const success = UserService.login(email, password);
		setMessage(success ? 'Login successful!' : 'Login failed');
	};

	return (
		<div>
			<h1>Login</h1>
			<form onSubmit={handleSubmit}>
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
				<button type='submit'>Login</button>
			</form>
			{message && <p>{message}</p>}
			<p>
				<Link to='/forgot-password'>Forgot Password?</Link>
			</p>
		</div>
	);
};

export default Login;
