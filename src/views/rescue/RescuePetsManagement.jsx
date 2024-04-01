import React, { useState, useEffect } from 'react';
import {
	Button,
	Modal,
	Form,
	Table,
	Row,
	Col,
	Container,
} from 'react-bootstrap';
import axios from 'axios';
import PaginationControls from '../../components/common/PaginationControls';

const RescuePetManagement = ({
	rescueId,
	canAddPet,
	canEditPet,
	canDeletePet,
}) => {
	const [pets, setPets] = useState([]);
	const [showPetModal, setShowPetModal] = useState(false);
	const [editingPet, setEditingPet] = useState({}); // Use an empty object as the default state
	const [isEditMode, setIsEditMode] = useState(false);

	const [currentPage, setCurrentPage] = useState(1);
	const [petsPerPage] = useState(10);

	const [filterType, setFilterType] = useState('');
	const [filterStatus, setFilterStatus] = useState('');
	const [sortCriteria, setSortCriteria] = useState({
		field: '',
		direction: '',
	});
	const [searchTerm, setSearchTerm] = useState(''); // Add this line

	// Base URL for your API
	const apiUrl = import.meta.env.VITE_API_BASE_URL; // Adjust accordingly

	useEffect(() => {
		fetchPets();
	}, [rescueId, searchTerm]);

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
		// console.log('Submitting:', editingPet);
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

	// Pagination Logic
	const indexOfLastPet = currentPage * petsPerPage;
	const indexOfFirstPet = indexOfLastPet - petsPerPage;
	const currentPets = pets.slice(indexOfFirstPet, indexOfLastPet);
	const totalPages = Math.ceil(pets.length / petsPerPage);

	const filteredAndSortedPets = currentPets
		.filter(
			(pet) =>
				(filterType ? pet.type === filterType : true) &&
				(filterStatus ? pet.status === filterStatus : true) &&
				(searchTerm
					? pet.petName.toLowerCase().includes(searchTerm.toLowerCase())
					: true) // Add this line
		)
		.sort((a, b) => {
			if (sortCriteria.field) {
				if (sortCriteria.direction === 'asc') {
					return a[sortCriteria.field] > b[sortCriteria.field] ? 1 : -1;
				} else {
					return a[sortCriteria.field] < b[sortCriteria.field] ? 1 : -1;
				}
			}
			return 0; // No sorting
		});

	console.log(pets);

	const uniqueTypes = [...new Set(currentPets.map((pet) => pet.type))];
	const uniqueStatuses = [...new Set(currentPets.map((pet) => pet.status))];

	return (
		<div>
			<h2>Pets</h2>

			<Container>
				<Row className='align-items-end mb-3'>
					<Col sm={6} md={12}>
						<Form.Control
							type='text'
							placeholder='Search pets by name...'
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</Col>
					<Col sm={6} md={3}>
						<Form.Label>Type Filter:</Form.Label>
						<Form.Select
							aria-label='Type Filter'
							value={filterType}
							onChange={(e) => setFilterType(e.target.value)}
						>
							<option value=''>All</option>
							{uniqueTypes.map((type, index) => (
								<option key={index} value={type}>
									{type}
								</option>
							))}
						</Form.Select>
					</Col>

					<Col sm={6} md={3}>
						<Form.Label>Status Filter:</Form.Label>
						<Form.Select
							aria-label='Status Filter'
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value)}
						>
							<option value=''>All</option>
							{uniqueStatuses.map((status, index) => (
								<option key={index} value={status}>
									{status}
								</option>
							))}
						</Form.Select>
					</Col>

					<Col sm={6} md={3}>
						<Form.Label>Sort By:</Form.Label>
						<Form.Select
							aria-label='Sort By'
							onChange={(e) => setSortCriteria(JSON.parse(e.target.value))}
						>
							<option value={JSON.stringify({ field: '', direction: '' })}>
								None
							</option>
							<option
								value={JSON.stringify({ field: 'age', direction: 'asc' })}
							>
								Age Ascending
							</option>
							<option
								value={JSON.stringify({ field: 'age', direction: 'desc' })}
							>
								Age Descending
							</option>
							{/* Add other sorting criteria as needed */}
						</Form.Select>
					</Col>

					<Col md={3}>
						<Button
							variant='primary'
							onClick={() => handleAddPet()}
							disabled={!canEditPet}
							className='w-100'
						>
							Add Pet
						</Button>
					</Col>
				</Row>
			</Container>
			<Table striped bordered hover responsive>
				<thead>
					<tr>
						<th>Name</th>
						<th>Type</th>
						<th>Status</th>
						<th>Age</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{filteredAndSortedPets.map((pet) => (
						<tr key={pet._id}>
							<td>{pet.petName}</td>
							<td>{pet.type}</td>
							<td>{pet.status}</td>
							<td>{pet.age}</td>
							<td>
								<Button
									variant='info'
									onClick={() => openEditModal(pet)}
									disabled={!canEditPet}
								>
									Edit pet
								</Button>{' '}
								<Button
									variant='danger'
									onClick={() => handlePetDelete(pet._id)}
									disabled={!canDeletePet}
								>
									Remove pet
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</Table>
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={setCurrentPage}
			/>
			<Modal show={showPetModal} onHide={() => setShowPetModal(false)}>
				<Modal.Header closeButton>
					<Modal.Title>{isEditMode ? 'Edit Pet' : 'Add Pet'}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Form onSubmit={handlePetSubmit}>
						{/* <!-- Basic Information Row --> */}
						<Row className='mb-3'>
							<Col xs={12} md={6}>
								<Form.Group>
									<Form.Label>Name</Form.Label>
									<Form.Control
										type='text'
										placeholder='Enter pet name'
										name='petName'
										value={editingPet.petName || ''}
										onChange={handlePetChange}
									/>
								</Form.Group>
							</Col>
							<Col xs={12} md={6}>
								<Form.Group>
									<Form.Label>Age</Form.Label>
									<Form.Control
										type='integer'
										placeholder="Enter pet's age"
										name='age'
										value={editingPet.age || ''}
										onChange={handlePetChange}
									/>
								</Form.Group>
							</Col>
						</Row>

						<Row className='mb-3'>
							<Col xs={12} md={4}>
								<Form.Group>
									<Form.Label>Gender</Form.Label>
									<Form.Control
										as='select'
										name='gender'
										value={editingPet.gender || ''}
										onChange={handlePetChange}
									>
										<option value=''>Select gender...</option>
										<option value='Male'>Male</option>
										<option value='Female'>Female</option>
										<option value='Other'>Other</option>
										<option value='Unknown'>Unknown</option>
									</Form.Control>
								</Form.Group>
							</Col>
							<Col xs={12} md={4}>
								<Form.Group>
									<Form.Label>Status</Form.Label>
									<Form.Control
										as='select'
										name='status'
										value={editingPet.status || ''}
										onChange={handlePetChange}
									>
										<option value=''>Select pet's status</option>
										<option value='Available'>Available</option>
										<option value='Reserved'>Reserved</option>
										<option value='Adoption Pending'>Adoption Pending</option>
										<option value='Adopted'>Adopted</option>
										<option value='Draft'>Draft</option>
										<option value='Quarantine'>Quarantine</option>
										<option value='On Hold'>On Hold</option>
										<option value='Not Available for Adoption'>
											Not Available for Adoption
										</option>
									</Form.Control>
								</Form.Group>
							</Col>
							<Col xs={12} md={4}>
								<Form.Group>
									<Form.Label>Type</Form.Label>
									<Form.Control
										type='text'
										placeholder="Enter pet's type"
										name='type'
										value={editingPet.type || ''}
										onChange={handlePetChange}
									/>
								</Form.Group>
							</Col>
						</Row>

						{/* {<!-- Descriptions Row -->} */}
						<Row className='mb-3'>
							<Col xs={12}>
								<Form.Group>
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
							</Col>
						</Row>

						<Row className='mb-3'>
							<Col xs={12}>
								<Form.Group>
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
							</Col>
						</Row>

						{/* { <!-- Characteristics -->} */}
						{/* {<!-- Common Characteristics Row -->} */}
						<Row className='mb-3'>
							<Col xs={12} md={4}>
								<Form.Group>
									<Form.Label>Size</Form.Label>
									<Form.Control
										type='text'
										placeholder="Enter pet's size"
										name='characteristics.common.size'
										value={editingPet.characteristics?.common?.size || ''}
										onChange={handlePetChange}
									/>
								</Form.Group>
							</Col>
							<Col xs={12} md={4}>
								<Form.Group>
									<Form.Label>Temperament</Form.Label>
									<Form.Control
										type='text'
										placeholder="Enter pet's temperament"
										name='characteristics.common.temperament'
										value={
											editingPet.characteristics?.common?.temperament || ''
										}
										onChange={handlePetChange}
									/>
								</Form.Group>
							</Col>
							<Col xs={12} md={4}>
								<Form.Group>
									<Form.Label>Vaccination Status</Form.Label>
									<Form.Control
										type='text'
										placeholder="Enter pet's vaccination status"
										name='characteristics.common.vaccination_status'
										value={
											editingPet.characteristics?.common?.vaccination_status ||
											''
										}
										onChange={handlePetChange}
									/>
								</Form.Group>
							</Col>
						</Row>

						{/* {<!-- Specific Characteristics Row -->} */}
						<Row className='mb-3'>
							<Col xs={12} md={4}>
								<Form.Group>
									<Form.Label>Breed</Form.Label>
									<Form.Control
										type='text'
										placeholder="Enter pet's breed"
										name='characteristics.specific.breed'
										value={editingPet.characteristics?.specific?.breed || ''}
										onChange={handlePetChange}
									/>
								</Form.Group>
							</Col>
							<Col xs={12} md={4}>
								<Form.Group>
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
							</Col>
							<Col xs={12} md={4}>
								<Form.Group>
									<Form.Label>Intelligence Level</Form.Label>
									<Form.Control
										type='text'
										placeholder="Enter pet's intelligence level"
										name='characteristics.specific.intelligence_level'
										value={
											editingPet.characteristics?.specific
												?.intelligence_level || ''
										}
										onChange={handlePetChange}
									/>
								</Form.Group>
							</Col>
						</Row>
						<Button variant='secondary' onClick={() => setShowPetModal(false)}>
							Close
						</Button>
						<Button
							variant='primary'
							type='submit'
							disabled={!canAddPet || !canEditPet}
						>
							Save Changes
						</Button>
					</Form>
				</Modal.Body>
			</Modal>
		</div>
	);
};

export default RescuePetManagement;
