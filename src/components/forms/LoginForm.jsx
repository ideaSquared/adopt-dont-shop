import React from 'react';
import { Form, Button } from 'react-bootstrap';

const LoginForm = ({ onEmailChange, onPasswordChange, onLogin }) => {
	return (
		<Form
			onSubmit={(e) => {
				e.preventDefault();
				onLogin();
			}}
		>
			<Form.Group className='mb-3' controlId='email'>
				<Form.Label>Email address</Form.Label>
				<Form.Control
					type='email'
					name='email'
					onChange={(e) => onEmailChange(e.target.value)}
					placeholder='Enter email'
				/>
			</Form.Group>
			<Form.Group className='mb-3' controlId='password'>
				<Form.Label>Password</Form.Label>
				<Form.Control
					type='password'
					name='password'
					onChange={(e) => onPasswordChange(e.target.value)}
					placeholder='Password'
				/>
			</Form.Group>
			<Button variant='primary' type='submit'>
				Login
			</Button>
			<a href='/forgot-password'>Forgot password?</a>
		</Form>
	);
};

export default LoginForm;
