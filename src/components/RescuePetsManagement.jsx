import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Table } from 'react-bootstrap';
import axios from 'axios';

const RescuePetManagement = ({ rescueId }) => {
	const [pets, setPets] = useState([]);
	const [showPetModal, setShowPetModal] = useState(false);
	const [editingPet, setEditingPet] = useState({}); // Use an empty object as the default state
	const [isEditMode, setIsEditMode] = useState(false);

	// Base URL for your API
	const apiUrl = import.meta.env.VITE_API_BASE_URL; // Adjust accordingly

	useEffect(() => {
		fetchPets();
	}, [rescueId]);

	const fetchPets = async () => {
		try {
			if (rescueId) {
				const response = await axios.get(`${apiUrl}/pets/owner/${rescueId}`, {
					withCredentials: true,
				});
				setPets(response.data);
			}
		} catch (error) {
			console.error('Failed to fetch pets:', error);
		}
	};

	function initialPetState() {
		return {
			petName: '',
			ownerId: rescueId,
			shortDescription: '',
			longDescription: '',
			age: '',
			gender: '',
			status: '',
			type: '',
			images: [],
			characteristics: {
				common: {
					size: '',
					temperament: '',
					vaccination_status: '',
				},
				specific: {
					breed: '',
					activity_level: '',
					intelligence_level: '',
				},
			},
			archived: false,
		};
	}

	const handlePetChange = (e) => {
		const { name, value } = e.target;
		if (name.includes('.')) {
			// Correct logic for nested fields
			const levels = name.split('.');
			setEditingPet((prev) => {
				let updated = { ...prev };
				let current = updated;
				for (let i = 0; i < levels.length - 1; i++) {
					if (!current[levels[i]] || typeof current[levels[i]] !== 'object') {
						current[levels[i]] = {};
					}
					current = current[levels[i]];
				}
				current[levels[levels.length - 1]] = value;
				return updated;
			});
		} else {
			// Corrected logic for non-nested fields
			setEditingPet((prev) => ({
				...prev,
				[name]: value, // This should directly update the editingPet object for non-nested fields
			}));
		}
	};

	const handlePetSubmit = async (event) => {
		event.preventDefault();
		console.log('Submitting:', editingPet);
		// Assuming your API expects the pet data in the same structure as editingPet
		const petData = {
			...editingPet,
			characteristics: {
				common: { ...editingPet.characteristics.common },
				specific: { ...editingPet.characteristics.specific },
			},
		};

		try {
			if (isEditMode) {
				await axios.put(`${apiUrl}/pets/${editingPet._id}`, petData, {
					withCredentials: true,
				});
			} else {
				await axios.post(`${apiUrl}/pets`, petData, {
					withCredentials: true,
				});
			}
			fetchPets();
			setShowPetModal(false);
			setEditingPet({});
			setIsEditMode(false);
		} catch (error) {
			console.error('Failed to submit pet:', error);
		}
	};

	const handlePetDelete = async (petId) => {
		const isConfirmed = window.confirm(
			'Are you sure you want to delete this pet?'
		);
		if (!isConfirmed) {
			return; // Stop the function if the user cancels the action
		}

		try {
			await axios.delete(`${apiUrl}/pets/${petId}`, {
				withCredentials: true,
			});
			fetchPets();
		} catch (error) {
			console.error('Failed to delete pet:', error);
		}
	};

	// This is triggered when an "Edit" button is clicked for a specific pet
	const openEditModal = (pet) => {
		const petWithFullStructure = {
			...initialPetState(),
			...pet,
		};
		setEditingPet(petWithFullStructure);
		setIsEditMode(true);
		setShowPetModal(true);
	};

	// This is triggered when the "Add Pet" button is clicked
	const handleAddPet = () => {
		setShowPetModal(true);
		setEditingPet(initialPetState()); // Ensure this includes the full structure
		setIsEditMode(false);
	};

	return (
		<div>
			<Button onClick={() => handleAddPet()}>Add Pet</Button>
			<Table striped bordered hover>
				<thead>
					<tr>
						<th>Name</th>
						<th>Type</th>
						<th>Age</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{pets.map((pet) => (
						<tr key={pet._id}>
							<td>{pet.petName}</td>
							<td>{pet.type}</td>
							<td>{pet.age}</td>
							<td>
								<Button variant='info' onClick={() => openEditModal(pet)}>
									Edit
								</Button>{' '}
								<Button
									variant='danger'
									onClick={() => handlePetDelete(pet._id)}
								>
									Delete
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</Table>
			<Modal show={showPetModal} onHide={() => setShowPetModal(false)}>
				<Modal.Header closeButton>
					<Modal.Title>{isEditMode ? 'Edit Pet' : 'Add Pet'}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Form onSubmit={handlePetSubmit}>
						<Form.Group className='mb-3'>
							<Form.Label>Name</Form.Label>
							<Form.Control
								type='text'
								placeholder='Enter pet name'
								name='petName'
								value={editingPet.petName || ''}
								onChange={handlePetChange}
							/>
						</Form.Group>
						<Form.Group className='mb-3'>
							<Form.Label>Short Description</Form.Label>
							<Form.Control
								as='textarea'
								rows={2}
								placeholder='Enter a short description'
								name='shortDescription'
								value={editingPet.shortDescription || ''}
								onChange={handlePetChange}
							/>
						</Form.Group>
						<Form.Group className='mb-3'>
							<Form.Label>Long Description</Form.Label>
							<Form.Control
								as='textarea'
								rows={3}
								placeholder='Enter a detailed description'
								name='longDescription'
								value={editingPet.longDescription || ''}
								onChange={handlePetChange}
							/>
						</Form.Group>
						<Form.Group className='mb-3'>
							<Form.Label>Age</Form.Label>
							<Form.Control
								type='text'
								placeholder="Enter pet's age"
								name='age'
								value={editingPet.age || ''}
								onChange={handlePetChange}
							/>
						</Form.Group>
						<Form.Group className='mb-3'>
							<Form.Label>Gender</Form.Label>
							<Form.Control
								type='text'
								placeholder="Enter pet's gender"
								name='gender'
								value={editingPet.gender || ''}
								onChange={handlePetChange}
							/>
						</Form.Group>
						<Form.Group className='mb-3'>
							<Form.Label>Status</Form.Label>
							<Form.Control
								type='text'
								placeholder="Enter pet's status"
								name='status'
								value={editingPet.status || ''}
								onChange={handlePetChange}
							/>
						</Form.Group>
						<Form.Group className='mb-3'>
							<Form.Label>Type</Form.Label>
							<Form.Control
								type='text'
								placeholder="Enter pet's type"
								name='type'
								value={editingPet.type || ''}
								onChange={handlePetChange}
							/>
						</Form.Group>
						{/* Handling nested characteristics */}
						<Form.Group className='mb-3'>
							<Form.Label>Size</Form.Label>
							<Form.Control
								type='text'
								placeholder="Enter pet's size"
								name='characteristics.common.size'
								value={editingPet.characteristics?.common?.size || ''}
								onChange={handlePetChange}
							/>
						</Form.Group>
						<Form.Group className='mb-3'>
							<Form.Label>Temperament</Form.Label>
							<Form.Control
								type='text'
								placeholder="Enter pet's temperament"
								name='characteristics.common.temperament'
								value={editingPet.characteristics?.common?.temperament || ''}
								onChange={handlePetChange}
							/>
						</Form.Group>
						<Form.Group className='mb-3'>
							<Form.Label>Vaccination Status</Form.Label>
							<Form.Control
								type='text'
								placeholder="Enter pet's vaccination status"
								name='characteristics.common.vaccination_status'
								value={
									editingPet.characteristics?.common?.vaccination_status || ''
								}
								onChange={handlePetChange}
							/>
						</Form.Group>
						{/* Handling specific characteristics */}
						<Form.Group className='mb-3'>
							<Form.Label>Breed</Form.Label>
							<Form.Control
								type='text'
								placeholder="Enter pet's breed"
								name='characteristics.specific.breed'
								value={editingPet.characteristics?.specific?.breed || ''}
								onChange={handlePetChange}
							/>
						</Form.Group>
						<Form.Group className='mb-3'>
							<Form.Label>Activity Level</Form.Label>
							<Form.Control
								type='text'
								placeholder="Enter pet's activity level"
								name='characteristics.specific.activity_level'
								value={
									editingPet.characteristics?.specific?.activity_level || ''
								}
								onChange={handlePetChange}
							/>
						</Form.Group>
						<Form.Group className='mb-3'>
							<Form.Label>Intelligence Level</Form.Label>
							<Form.Control
								type='text'
								placeholder="Enter pet's intelligence level"
								name='characteristics.specific.intelligence_level'
								value={
									editingPet.characteristics?.specific?.intelligence_level || ''
								}
								onChange={handlePetChange}
							/>
						</Form.Group>
						<Button variant='secondary' onClick={() => setShowPetModal(false)}>
							Close
						</Button>
						<Button variant='primary' type='submit'>
							Save Changes
						</Button>
					</Form>
				</Modal.Body>
			</Modal>
		</div>
	);
};

export default RescuePetManagement;
