// PetActionSelection.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

const PetActionSelection = () => {
	const navigate = useNavigate();

	const handleActionSelection = (action) => {
		// Perform any logic based on the selection or navigate to different pages
		console.log(`Selected action: ${action}`);
		// Example navigation, adjust according to your app's routes
		navigate(action === 'adopt' ? '/' : '/select-account-type');
	};

	return (
		<div>
			<h2>I'm looking to...</h2>
			<button onClick={() => handleActionSelection('adopt')}>
				Adopt a Pet
			</button>
			<button onClick={() => handleActionSelection('rehome')}>
				Rehome a Pet
			</button>
		</div>
	);
};

export default PetActionSelection;
