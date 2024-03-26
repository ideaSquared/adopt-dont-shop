// Pets.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Table, Container, Form, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

axios.defaults.withCredentials = true;

const Pets = () => {
	const [pets, setPets] = useState([]);
	const navigate = useNavigate();
	const { isAdmin } = useAuth();

	const [searchName, setSearchName] = useState('');
	const [filterType, setFilterType] = useState('');

	const [showModal, setShowModal] = useState(false);
	const [selectedPetDetails, setSelectedPetDetails] = useState(null);

	useEffect(() => {
		if (!isAdmin) {
			navigate('/');
			return;
		}
		fetchPets();
	}, [isAdmin, navigate]);

	const uniquePetTypes = Array.from(new Set(pets.map((pet) => pet.type)));

	const fetchPets = async () => {
		const endpoint = `${import.meta.env.VITE_API_BASE_URL}/admin/pets`;
		try {
			const res = await axios.get(endpoint);
			if (Array.isArray(res.data)) {
				setPets(res.data);
			} else {
				console.error('Data is not an array:', res.data);
				setPets([]);
			}
		} catch (error) {
			alert('Failed to fetch pets.');
			console.error(error);
		}
	};

	const fetchPetDetails = async (petId) => {
		try {
			const endpoint = `${
				import.meta.env.VITE_API_BASE_URL
			}/admin/pets/${petId}`;
			const res = await axios.get(endpoint);
			setSelectedPetDetails(res.data);
			setShowModal(true); // Show the modal with pet details
		} catch (error) {
			alert('Failed to fetch pet details.');
			console.error(error);
		}
	};

	const deletePet = async (id) => {
		// Confirmation dialog
		const isConfirmed = window.confirm(
			'Are you sure you want to delete this pet?'
		);
		if (!isConfirmed) {
			return; // Stop the function if the user cancels the action
		}
		try {
			await axios.delete(
				`${import.meta.env.VITE_API_BASE_URL}/admin/pets/${id}`
			);
			fetchPets(); // Refresh the list after deleting
		} catch (error) {
			alert('Failed to delete pet. Make sure you are logged in as an admin.');
			console.error(error);
		}
	};

	const filteredPets = pets
		.filter((pet) => (filterType ? pet.type === filterType : true))
		.filter(
			(pet) =>
				// Include rescue if searchName is empty or if rescueName matches searchName
				searchName === '' ||
				pet.petName?.toLowerCase().includes(searchName.toLowerCase())
		);

	return (
		<>
			<Container>
				<div className='mt-3 mb-3'>
					<Form>
						<Form.Group controlId='formPetType' className='mb-2'>
							<Form.Label>Filter by Type</Form.Label>
							<Form.Control
								as='select'
								value={filterType}
								onChange={(e) => setFilterType(e.target.value)}
							>
								<option value=''>All Types</option>
								{uniquePetTypes.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</Form.Control>
						</Form.Group>
						<Form.Group className='mb-3' controlId='searchName'>
							<Form.Label>Search by Name</Form.Label>
							<Form.Control
								type='text'
								placeholder='Search by animal name'
								value={searchName}
								onChange={(e) => setSearchName(e.target.value)}
							/>
						</Form.Group>
					</Form>
					<Table striped bordered hover>
						<thead>
							<tr>
								<th>Pet Name</th>
								<th>Type</th>
								<th>Status</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{filteredPets.map((pet) => (
								<tr key={pet._id}>
									<td>{pet.petName}</td>
									<td>{pet.type}</td>
									<td>{pet.status}</td>
									<td>
										<Button
											variant='info'
											onClick={() => fetchPetDetails(pet._id)}
										>
											Details
										</Button>{' '}
										<Button variant='danger' onClick={() => deletePet(pet._id)}>
											Delete
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</Table>
				</div>
			</Container>

			<Modal show={showModal} onHide={() => setShowModal(false)}>
				<Modal.Header closeButton>
					<Modal.Title>Pet Details</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{selectedPetDetails ? (
						<div>
							<h4>{selectedPetDetails.petName}</h4>
							<p>
								<b>Type:</b> {selectedPetDetails.type}
							</p>
							<p>
								<b>Age:</b> {selectedPetDetails.age} years
							</p>
						</div>
					) : (
						<p>Loading details...</p>
					)}
				</Modal.Body>
				<Modal.Footer>
					<Button variant='secondary' onClick={() => setShowModal(false)}>
						Close
					</Button>
				</Modal.Footer>
			</Modal>
		</>
	);
};

export default Pets;
