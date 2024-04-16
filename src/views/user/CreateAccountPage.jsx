import React, { useState } from 'react';
import CreateAccountForm from '../../components/forms/CreateAccountForm';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

import { Container } from 'react-bootstrap';
import AlertComponent from '../../components/common/AlertComponent'; // Make sure the path is correct

const CreateAccountPage = () => {
	const [firstName, setFirstName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [alert, setAlert] = useState({ show: false, message: '', type: '' });
	const navigate = useNavigate(); // Initialize useNavigate
	const { createUser } = useAuth();

	const handleCreateAccount = async () => {
		try {
			await createUser(firstName, email, password);
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
			<div className='justify-content-md-center w-50'>
				{alert.show && (
					<AlertComponent
						type={alert.type}
						message={alert.message}
						onClose={handleCloseAlert}
					/>
				)}
				<CreateAccountForm
					onFirstNameChange={setFirstName}
					onEmailChange={setEmail}
					onPasswordChange={setPassword}
					onCreateAccount={handleCreateAccount}
				/>
			</div>
		</Container>
	);
};

export default CreateAccountPage;
