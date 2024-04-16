import React from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

const CreateAccountForm = ({
	onFirstNameChange,
	onEmailChange,
	onPasswordChange,
	onCreateAccount,
}) => {
	return (
		<Form
			onSubmit={(e) => {
				e.preventDefault();
				onCreateAccount();
			}}
		>
			<Form.Group className='mb-3' controlId='email'>
				<Form.Label>First name</Form.Label>
				<Form.Control
					type='type'
					name='firstName'
					onChange={(e) => onFirstNameChange(e.target.value)}
					placeholder='Enter first name'
				/>
			</Form.Group>
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

			<Row>
				<Col>
					<Button variant='primary' type='submit'>
						Create Account
					</Button>
				</Col>
				<Col className='d-flex justify-content-end'>
					<a href='/create-rescue-account' className='align-self-center'>
						Are you a rescue?
					</a>
				</Col>
			</Row>
		</Form>
	);
};

export default CreateAccountForm;
