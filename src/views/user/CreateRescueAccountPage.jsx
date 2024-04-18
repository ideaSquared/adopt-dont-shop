import React, { useState } from 'react';
import CreateRescueAccountForm from '../../components/forms/CreateRescueAccountForm';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

import { Container } from 'react-bootstrap';
import AlertComponent from '../../components/common/AlertComponent'; // Make sure the path is correct

const CreateRescueAccountPage = () => {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [rescueType, setRescueType] = useState('individual');
	const [rescueName, setRescueName] = useState('');
	const [referenceNumber, setReferenceNumber] = useState('');
	// New state hooks for the address components
	// const [addressLine1, setAddressLine1] = useState('');
	// const [addressLine2, setAddressLine2] = useState('');
	const [city, setCity] = useState('');
	// const [county, setCounty] = useState('');
	// const [postcode, setPostcode] = useState('');
	const [country, setCountry] = useState('United Kingdom'); // Default to UK, can be changed as needed
	const navigate = useNavigate(); // Initialize useNavigate
	const [alert, setAlert] = useState({ show: false, message: '', type: '' });
	const { createRescue } = useAuth();

	const handleCreateRescueAccount = async () => {
		try {
			const response = await createRescue(
				firstName,
				lastName,
				email,
				password,
				rescueType,
				rescueName,
				city,
				country,
				referenceNumber
			);

			console.log('Create rescue account successful', response.data);
			// Proceed to redirect the user or save the login state
			navigate('/');
		} catch (error) {
			console.error('Create rescue account failed', error.response.data);
			setAlert({
				show: true,
				message: 'Failed to create rescue account. Please try again.',
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
			<div className='justify-content-md-center w-75'>
				{alert.show && (
					<AlertComponent
						type={alert.type}
						message={alert.message}
						onClose={handleCloseAlert}
					/>
				)}
				<CreateRescueAccountForm
					onFirstNameChange={setFirstName}
					onLastNameChange={setLastName}
					onEmailChange={setEmail}
					onPasswordChange={setPassword}
					onConfirmPasswordChange={setConfirmPassword}
					onRescueTypeChange={setRescueType}
					onRescueNameChange={setRescueName}
					// onAddressLine1Change={setAddressLine1}
					// onAddressLine2Change={setAddressLine2}
					onCityChange={setCity}
					// onCountyChange={setCounty}
					// onPostcodeChange={setPostcode}
					onCountryChange={setCountry}
					onCreateRescueAccount={handleCreateRescueAccount}
					rescueType={rescueType}
					onReferenceNumberChange={setReferenceNumber}
					password={password}
					confirmPassword={confirmPassword}
				/>
			</div>
		</Container>
	);
};

export default CreateRescueAccountPage;
