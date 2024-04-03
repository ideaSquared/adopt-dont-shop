import React from 'react';
import { Form, Button } from 'react-bootstrap';

const CreateRescueAccountForm = ({
	onFirstNameChange,
	onEmailChange,
	onPasswordChange,
	onRescueTypeChange,
	onRescueNameChange,
	onRescueAddressChange,
	onCreateRescueAccount,
}) => {
	return (
		<Form
			onSubmit={(e) => {
				e.preventDefault();
				onCreateRescueAccount();
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

			<Form.Group className='mb-3' controlId='rescueType'>
				<Form.Label>What type of rescue are you?</Form.Label>
				<Form.Control
					as='select'
					name='rescueType'
					onChange={(e) => onRescueTypeChange(e.target.value)}
				>
					<option value='individual'>Individual seller</option>
					<option value='charity'>Registered charity</option>
					<option value='company'>Registered company</option>
					<option value='other'>Other</option>
				</Form.Control>
			</Form.Group>

			<Form.Group className='mb-3' controlId='rescueName'>
				<Form.Label>Rescue name</Form.Label>
				<Form.Control
					type='type'
					name='rescueName'
					onChange={(e) => onRescueNameChange(e.target.value)}
					placeholder='Enter rescue name'
				/>
			</Form.Group>

			<Form.Group className='mb-3' controlId='rescueAddress'>
				<Form.Label>Rescue address</Form.Label>
				<Form.Control
					type='type'
					name='rescueAddress'
					onChange={(e) => onRescueAddressChange(e.target.value)}
					placeholder='Enter rescue address'
				/>
			</Form.Group>

			<Button variant='primary' type='submit'>
				Create Account
			</Button>
			<a href='/create-rescue-account'>Are you not a rescue?</a>
		</Form>
	);
};

export default CreateRescueAccountForm;
