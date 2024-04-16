import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import AlertComponent from '../../components/common/AlertComponent';

const AccountProfileForm = ({ initialData, updateUserDetails }) => {
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		confirmPassword: '',
		firstName: '',
		lastName: '',
	});
	const [alert, setAlert] = useState({ message: null, type: null });

	useEffect(() => {
		setFormData({
			email: '',
			password: '',
			confirmPassword: '',
			firstName: '',
			lastName: '',
			...initialData,
		});
	}, [initialData]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prevState) => ({
			...prevState,
			[name]: value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		// Client-side validation for password length
		if (formData.password && formData.password !== formData.confirmPassword) {
			setAlert({ message: 'Your passwords must match.', type: 'danger' });
			return;
		}

		if (formData.password && formData.password.length < 6) {
			setAlert({
				message: 'Password must be at least 6 characters long.',
				type: 'danger',
			});
			return;
		}

		try {
			const result = await updateUserDetails(formData);
			if (result.success) {
				setAlert({ message: 'Updated account successfully!', type: 'success' });
			} else {
				// This should handle any additional server-side errors that aren't caught by client-side validation
				throw new Error(result.error || 'Failed to update details');
			}
		} catch (error) {
			setAlert({ message: error.message, type: 'danger' });
		}
	};

	return (
		<>
			{alert.message && (
				<AlertComponent
					type={alert.type}
					message={alert.message}
					onClose={() => setAlert({ message: null, type: null })}
				/>
			)}
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
				<Form.Group className='mb-3' controlId='lastName'>
					<Form.Label>First name</Form.Label>
					<Form.Control
						type='text'
						name='lastName'
						value={formData.lastName}
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
							<Form.Label>New password</Form.Label>
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
							<Form.Label>Confirm new password</Form.Label>
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
	);
};

export default AccountProfileForm;
