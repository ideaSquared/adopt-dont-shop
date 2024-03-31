// PetActionSelection.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container } from 'react-bootstrap';

const PetActionSelection = () => {
	const navigate = useNavigate();

	const handleActionSelection = (action) => {
		// Perform any logic based on the selection or navigate to different pages
		// console.log(`Selected action: ${action}`);
		// Example navigation, adjust according to your app's routes
		navigate(action === 'adopt' ? '/' : '/select-account-type');
	};

	return (
		<Container>
			<h2>I'm looking to...</h2>
			<Button variant='primary' onClick={() => handleActionSelection('adopt')}>
				Adopt a Pet
			</Button>
			<Button variant='primary' onClick={() => handleActionSelection('rehome')}>
				Rehome a Pet
			</Button>
		</Container>
	);
};

export default PetActionSelection;
