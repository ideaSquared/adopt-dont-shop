import React, { useState } from 'react';
import CreateRescueAccountForm from '../../components/forms/CreateRescueAccountForm';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AuthService from '../../services/AuthService';

const CreateRescueAccountPage = () => {
	const [firstName, setFirstName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [rescueType, setRescueType] = useState('individual');
	const [rescueName, setRescueName] = useState('');
	// New state hooks for the address components
	const [addressLine1, setAddressLine1] = useState('');
	const [addressLine2, setAddressLine2] = useState('');
	const [city, setCity] = useState('');
	const [county, setCounty] = useState('');
	const [postcode, setPostcode] = useState('');
	const [country, setCountry] = useState('United Kingdom'); // Default to UK, can be changed as needed
	const navigate = useNavigate(); // Initialize useNavigate

	const handleCreateRescueAccount = async () => {
		try {
			const response = await AuthService.createAccountRescue(
				firstName,
				email,
				password,
				rescueType,
				rescueName,
				addressLine1,
				addressLine2,
				city,
				county,
				postcode,
				country
			);
			console.log('Create rescue account successful', response.data);
			// Proceed to redirect the user or save the login state
			navigate('/');
		} catch (error) {
			console.error('Create rescue account failed', error.response.data);
		}
	};

	return (
		<div>
			<CreateRescueAccountForm
				onFirstNameChange={setFirstName}
				onEmailChange={setEmail}
				onPasswordChange={setPassword}
				onRescueTypeChange={setRescueType}
				onRescueNameChange={setRescueName}
				onAddressLine1Change={setAddressLine1}
				onAddressLine2Change={setAddressLine2}
				onCityChange={setCity}
				onCountyChange={setCounty}
				onPostcodeChange={setPostcode}
				onCountryChange={setCountry}
				onCreateRescueAccount={handleCreateRescueAccount}
			/>
		</div>
	);
};

export default CreateRescueAccountPage;
