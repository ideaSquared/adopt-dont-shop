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
		// Submit formData to your backend
		// console.log(formData);
		// Assuming '/api/rescue' is your endpoint for creating a rescue
		// Adjust navigation or add more logic as needed
		navigate('/success-page');
	};

	return (
		<Container>
			<h2>Company Registration Form</h2>
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
						required
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
