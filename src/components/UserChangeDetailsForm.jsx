import React, { useState, useEffect } from 'react';
import AlertComponent from './AlertComponent';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Row, Col } from 'react-bootstrap';

const ChangeDetailsForm = () => {
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		confirmPassword: '', // Add confirm password field
		firstName: '',
	});
	const [alert, setAlert] = useState({ message: null, type: null });
	const token = localStorage.getItem('token');
	const navigate = useNavigate();

	// Function to fetch current user details and pre-fill the form
	useEffect(() => {
		const fetchUserDetails = async () => {
			try {
				const response = await fetch(
					`${import.meta.env.VITE_API_BASE_URL}/auth/details`,
					{
						method: 'GET',
						credentials: 'include',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
					}
				);

				const data = await response.json();
				if (response.ok) {
					setFormData({
						...formData,
						email: data.email,
						firstName: data.firstName,
					});
				} else {
					throw new Error(data.message || 'Failed to fetch user details.');
				}
			} catch (error) {
				setAlert({ message: error.message, type: 'danger' });
			}
		};

		fetchUserDetails();
	}, [token]); // Ensure the effect runs once on component mount

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prevState) => ({
			...prevState,
			[name]: value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		// Validate password and confirmPassword match
		if (formData.password !== formData.confirmPassword) {
			setAlert({ message: 'Passwords do not match.', type: 'danger' });
			return; // Stop the form submission
		}

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_BASE_URL}/auth/details`,
				{
					method: 'PUT',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(formData),
				}
			);

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || 'Failed to update details.');
			}

			setAlert({ message: 'Details updated successfully!', type: 'success' });
		} catch (error) {
			setAlert({ message: error.message, type: 'danger' });
		}
	};

	return (
		<Container>
			<>
				<AlertComponent
					type={alert.type}
					message={alert.message}
					onClose={() => setAlert({ message: null, type: null })}
				/>
				<Form onSubmit={handleSubmit}>
					<Form.Group className='mb-3' controlId='firstName'>
						<Form.Label>First name</Form.Label>
						<Form.Control
							type='text'
							name='firstName'
							value={formData.firstName}
							onChange={handleChange}
						/>
					</Form.Group>

					<Form.Group className='mb-3' controlId='email'>
						<Form.Label>Email</Form.Label>
						<Form.Control
							type='email'
							name='email'
							value={formData.email}
							onChange={handleChange}
						/>
					</Form.Group>

					<Row>
						<Col>
							<Form.Group className='mb-3' controlId='password'>
								<Form.Label>Password</Form.Label>
								<Form.Control
									type='password'
									name='password'
									value={formData.password}
									onChange={handleChange}
								/>
							</Form.Group>
						</Col>
						<Col>
							<Form.Group className='mb-3' controlId='confirmPassword'>
								<Form.Label>Confirm password</Form.Label>
								<Form.Control
									type='password'
									name='confirmPassword'
									value={formData.confirmPassword}
									onChange={handleChange}
								/>
							</Form.Group>
						</Col>
					</Row>

					<Button variant='primary' type='submit'>
						Update Details
					</Button>
				</Form>
			</>
		</Container>
	);
};

export default ChangeDetailsForm;
