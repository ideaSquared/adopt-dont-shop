import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserService } from '@adoptdontshop/libs/users/';
import { Button, FormInput, TextInput } from '@adoptdontshop/components';

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

				<FormInput label='Password'>
					<TextInput
						value={password}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setPassword(e.target.value)
						}
						type='password'
						required
					/>
				</FormInput>

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
