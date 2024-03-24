// CharityForm.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container } from 'react-bootstrap';

const CharityForm = () => {
	const [formData, setFormData] = useState({
		rescueName: '',
		rescueAddress: '',
		referenceNumber: '',
	});
	const navigate = useNavigate();

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prevState) => ({ ...prevState, [name]: value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		try {
			const userId = localStorage.getItem('userId'); // Retrieve stored user ID
			const requestBody = {
				rescueName: formData.rescueName, // Prefill rescueName from the form
				rescueAddress: formData.rescueAddress, // Prefill rescueAddress from the form
				rescueType: 'Charity',
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

			// Conditionally add referenceNumber if it's filled in
			if (formData.referenceNumber.trim()) {
				requestBody.referenceNumber = formData.referenceNumber;
			}

			const response = await fetch(
				`${import.meta.env.VITE_API_BASE_URL}/rescue/charity`,
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
				console.log('Rescue created successfully', data);
				navigate('/login');
			} else {
				// Handle server-side validation errors or other issues
				console.error('Failed to create rescue', data.message);
			}
		} catch (error) {
			// Handle unexpected errors
			console.error('Error creating rescue', error);
		}

		navigate('/login');
	};

	return (
		<Container>
			<h2>Charity Registration Form</h2>
			<form onSubmit={handleSubmit}>
				<div className='mb-3'>
					<label htmlFor='rescueName' className='form-label'>
						Rescue Name
					</label>
					<input
						type='text'
						className='form-control'
						id='rescueName'
						name='rescueName'
						value={formData.rescueName}
						onChange={handleChange}
						required
					/>
				</div>
				<div className='mb-3'>
					<label htmlFor='rescueAddress' className='form-label'>
						Rescue Address
					</label>
					<input
						type='text'
						className='form-control'
						id='rescueAddress'
						name='rescueAddress'
						value={formData.rescueAddress}
						onChange={handleChange}
						required
					/>
				</div>
				<div className='mb-3'>
					<label htmlFor='referenceNumber' className='form-label'>
						Reference Number
					</label>
					<input
						type='text'
						className='form-control'
						id='referenceNumber'
						name='referenceNumber'
						value={formData.referenceNumber}
						onChange={handleChange}
					/>
				</div>
				<button type='submit' className='btn btn-primary'>
					Submit
				</button>
			</form>
		</Container>
	);
};

export default CharityForm;
