// AccountTypeSelection.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container } from 'react-bootstrap';

const AccountTypeSelection = () => {
	const navigate = useNavigate();

	const createIndividualRescue = async () => {
		try {
			const userId = localStorage.getItem('userId'); // Retrieve stored user ID
			const requestBody = {
				rescueType: 'Individual',
				staff: [
					{
						userId: userId, // Assuming this is how you've stored/fetched the userId
						permissions: [
							'edit_rescue_info',
							'add_pet',
							'edit_pet',
							'delete_pet',
							'send_messages',
						],
						verifiedByRescue: true,
					},
				],
			};
			const response = await fetch(
				`${import.meta.env.VITE_API_BASE_URL}/rescue/individual`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(requestBody),
				}
			);

			const data = await response.json();
			if (response.ok) {
				// Handle success, maybe navigate to a success page or display a success message
				// console.log('Rescue created successfully', data);
				navigate('/login');
			} else {
				// Handle server-side validation errors or other issues
				console.error('Failed to create rescue', data.message);
			}
		} catch (error) {
			// Handle unexpected errors
			console.error('Error creating rescue', error);
		}
	};

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
		<Container>
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
		</Container>
	);
};

export default AccountTypeSelection;
