// AccountTypeSelection.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';

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
			<div>
				<Button variant='primary' onClick={() => handleSelection('individual')}>
					Individual
				</Button>
				<Button variant='primary' onClick={() => handleSelection('charity')}>
					Registered Charity
				</Button>
				<Button variant='primary' onClick={() => handleSelection('company')}>
					Registered Company
				</Button>
				<Button variant='primary' onClick={() => handleSelection('other')}>
					Other
				</Button>
			</div>
		</div>
	);
};

export default AccountTypeSelection;
