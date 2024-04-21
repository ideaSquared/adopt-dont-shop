import React, { useState } from 'react';
import LoginForm from '../../components/forms/LoginForm';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AlertComponent from '../../components/common/AlertComponent'; // Make sure the path is correct

import { Container, Card, Row, Col } from 'react-bootstrap';

const LoginPage = () => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const navigate = useNavigate(); // Initialize useNavigate
	const [alert, setAlert] = useState({ show: false, message: '', type: '' });
	const { login } = useAuth();

	const handleLogin = async () => {
		try {
			// Use the login method from AuthContext
			await login(email, password);
			console.log('Login successful');
			// Redirect the user after successful login
			navigate('/');
		} catch (error) {
			// Handle errors as per your AuthContext's error handling logic
			// Assuming error message is available as error.message
			console.error('Login failed', error.message);
			setAlert({
				show: true,
				message: 'Failed to login. Please try again.',
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
			<Row className='w-75'>
				<Col xs={12}>
					<Card className='bg-light'>
						<Card.Body>
							<div className='justify-content-md-center '>
								{alert.show && (
									<AlertComponent
										type={alert.type}
										message={alert.message}
										onClose={handleCloseAlert}
									/>
								)}
								<LoginForm
									onEmailChange={setEmail}
									onPasswordChange={setPassword}
									onLogin={handleLogin}
								/>
							</div>
						</Card.Body>
					</Card>
				</Col>
			</Row>
		</Container>
	);
};

export default LoginPage;
