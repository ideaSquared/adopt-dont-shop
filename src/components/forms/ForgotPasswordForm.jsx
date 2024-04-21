import React from 'react';
import { Form, Button } from 'react-bootstrap';

const ForgotPassword = ({ onEmailChange, onForgotPassword }) => {
	return (
		<Form
			onSubmit={(e) => {
				e.preventDefault();
				onForgotPassword();
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
			<Button variant='secondary' type='submit'>
				Reset my password
			</Button>
		</Form>
	);
};

export default ForgotPassword;
