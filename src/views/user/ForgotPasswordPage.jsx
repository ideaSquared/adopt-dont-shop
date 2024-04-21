import React, { useState } from 'react';
import ForgotPasswordForm from '../../components/forms/ForgotPasswordForm';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col } from 'react-bootstrap';
import AlertComponent from '../../components/common/AlertComponent'; // Make sure the path is correct

const ForgotPasswordPage = () => {
	const [email, setEmail] = useState('');
	const navigate = useNavigate(); // Initialize useNavigate
	const [alert, setAlert] = useState({ show: false, message: '', type: '' });
	const { sendForgotPasswordEmail } = useAuth();

	const handleForgotPassword = async () => {
		try {
			await sendForgotPasswordEmail(email);
			console.log('Login successful', response.data);
			// Proceed to redirect the user or save the login state
			navigate('/');
		} catch (error) {
			console.error('Login failed', error.response.data);
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
							{alert.show && (
								<AlertComponent
									type={alert.type}
									message={alert.message}
									onClose={handleCloseAlert}
								/>
							)}
							<div className='justify-content-md-center'>
								<ForgotPasswordForm
									onEmailChange={setEmail}
									onForgotPassword={handleForgotPassword}
								/>
							</div>
						</Card.Body>
					</Card>
				</Col>
			</Row>
		</Container>
	);
};

export default ForgotPasswordPage;
