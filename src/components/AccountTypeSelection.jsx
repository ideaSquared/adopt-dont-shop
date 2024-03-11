// AccountTypeSelection.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

const AccountTypeSelection = () => {
	const navigate = useNavigate();

	const handleSelection = (selection) => {
		switch (selection) {
			case 'individual':
				// Assuming you have a function to create an Individual rescue
				createIndividualRescue();
				break;
			case 'charity':
			case 'company':
				navigate(`/${selection}-form`);
				break;
			case 'other':
				navigate('/contact-us');
				break;
			default:
				console.error('Invalid selection');
		}
	};

	return (
		<div>
			<h2>I'm looking to...</h2>
			<button onClick={() => handleSelection('individual')}>Individual</button>
			<button onClick={() => handleSelection('charity')}>
				Registered Charity
			</button>
			<button onClick={() => handleSelection('company')}>
				Registered Company
			</button>
			<button onClick={() => handleSelection('other')}>Other</button>
		</div>
	);
};

export default AccountTypeSelection;
