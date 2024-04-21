import React, { useState } from 'react';
import CreateAccountForm from '../../components/forms/CreateAccountForm';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

import { Card, Container, Row, Col } from 'react-bootstrap';
import AlertComponent from '../../components/common/AlertComponent'; // Make sure the path is correct

const CreateAccountPage = () => {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [city, setCity] = useState('');
	const [country, setCountry] = useState('');
	const [alert, setAlert] = useState({ show: false, message: '', type: '' });
	const navigate = useNavigate(); // Initialize useNavigate
	const { createUser } = useAuth();

	const handleCreateAccount = async () => {
		try {
			await createUser(firstName, lastName, email, password, city, country);
			console.log('Create user account successful');
			// Proceed to redirect the user or save the login state
			navigate('/');
		} catch (error) {
			console.error('Create user account failed', error.response.data);
			setAlert({
				show: true,
				message: 'Failed to create account. Please try again.',
				type: 'danger',
			});
		}
	};

	const handleCloseAlert = () => {
		setAlert({ ...alert, show: false });
	};

	return (
		<Container
			className='d-flex justify-content-center align-items-center'
			style={{ minHeight: '100vh' }}
		>
			<Row>
				<Col xs={12}>
					<Card className='bg-light'>
						<Card.Body>
							<div className='justify-content-md-center'>
								{alert.show && (
									<AlertComponent
										type={alert.type}
										message={alert.message}
										onClose={handleCloseAlert}
									/>
								)}
								<CreateAccountForm
									onFirstNameChange={setFirstName}
									onLastNameChange={setLastName}
									onEmailChange={setEmail}
									onPasswordChange={setPassword}
									onCreateAccount={handleCreateAccount}
									onCityChange={setCity}
									onCountryChange={setCountry}
									onConfirmPasswordChange={setConfirmPassword}
									password={password}
									confirmPassword={confirmPassword}
								/>
							</div>
						</Card.Body>
					</Card>
				</Col>
			</Row>
		</Container>
	);
};

export default CreateAccountPage;
