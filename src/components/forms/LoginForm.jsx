import React from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

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

			<Row>
				<Col>
					<Button variant='primary' type='submit'>
						Login
					</Button>
				</Col>
				<Col className='d-flex justify-content-end'>
					<Link to='/forgot-password' className='align-self-center'>
						Forgot password?
					</Link>
				</Col>
			</Row>
		</Form>
	);
};

export default LoginForm;
