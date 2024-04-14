import React from 'react';
import { Form, Button } from 'react-bootstrap';

const ResetPasswordForm = ({
	onPasswordChange,
	onConfirmPasswordChange,
	onResetPassword,
}) => {
	return (
		<Form
			onSubmit={(e) => {
				e.preventDefault();
				onResetPassword();
			}}
		>
			<Form.Group className='mb-3' controlId='password'>
				<Form.Label>Password</Form.Label>
				<Form.Control
					type='password'
					name='password'
					onChange={(e) => onPasswordChange(e.target.value)}
					placeholder='Password'
				/>
			</Form.Group>
			<Form.Group className='mb-3' controlId='confirmPassword'>
				<Form.Label>Confirm Password</Form.Label>
				<Form.Control
					type='password'
					name='confirmPassword'
					onChange={(e) => onConfirmPasswordChange(e.target.value)}
					placeholder='Confirm Password'
				/>
			</Form.Group>
			<Button variant='primary' type='submit'>
				Reset Password
			</Button>
		</Form>
	);
};

export default ResetPasswordForm;
