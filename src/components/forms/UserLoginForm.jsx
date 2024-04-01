// LoginForm.jsx
import React, { useState } from 'react';
import { Form, Button, Alert, Container } from 'react-bootstrap';
import AlertComponent from '../common/AlertComponent';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth hook

const LoginForm = () => {
	const [formData, setFormData] = useState({ email: '', password: '' });
	const [alert, setAlert] = useState({ message: null, type: null });
	const navigate = useNavigate(); // Initialize useNavigate
	const { login } = useAuth();
	// Use useLocation hook to access query parameters
	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);
	const rescue = queryParams.get('rescue');

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prevState) => ({
			...prevState,
			[name]: value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			await login(formData.email, formData.password); // Use login method from context
			setAlert({ message: 'Login successful!', type: 'success' });
			setFormData({ email: '', password: '' }); // Clear form data

			// Conditional navigation based on 'rescue' query parameter
			if (rescue === 'true') {
				navigate('/select-account-type');
			} else {
				navigate('/'); // Redirect to home after successful login
			}
		} catch (error) {
			// Assuming login method provides an error with a message property
			const errorMessage =
				error.message || 'Login failed due to an unexpected error.';
			setAlert({ message: errorMessage, type: 'danger' });
		}
	};

	return (
		<Container>
			<>
				{alert.message && (
					<AlertComponent
						type={alert.type}
						message={alert.message}
						onClose={() => setAlert({ message: null, type: null })}
					/>
				)}
				<Form onSubmit={handleSubmit}>
					<Form.Group className='mb-3' controlId='email'>
						<Form.Label>Email address</Form.Label>
						<Form.Control
							type='email'
							name='email'
							value={formData.email}
							onChange={handleChange}
							placeholder='Enter email'
						/>
					</Form.Group>
					<Form.Group className='mb-3' controlId='password'>
						<Form.Label>Password</Form.Label>
						<Form.Control
							type='password'
							name='password'
							value={formData.password}
							onChange={handleChange}
							placeholder='Password'
						/>
					</Form.Group>
					<Button variant='primary' type='submit'>
						Login
					</Button>
				</Form>
				<Link to='/forgot-password'>Forgot your password?</Link>
			</>
		</Container>
	);
};

export default LoginForm;
