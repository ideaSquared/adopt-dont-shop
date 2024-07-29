import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import UserService from '@lib/users/UserService';
import TextInput from '@components/form/TextInput';
import Button from '@components/common/Button';

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
				<Button type='submit'>Login</Button>
			</form>
			{message && <p>{message}</p>}
			<p>
				<Link to='/forgot-password'>Forgot Password?</Link>
			</p>
		</div>
	);
};

export default Login;
