import React, { useState, useEffect } from 'react';
import { Container, Button } from 'react-bootstrap';
import { useAdminRedirect } from '../../hooks/useAdminRedirect';
import PetTable from '../../components/tables/PetsTable';
import PetModalForm from '../../components/modals/PetModalForm';
import PetService from '../../services/PetService';
import GenericFilterForm from '../../components/forms/GenericFilterForm';

const Pets = () => {
	useAdminRedirect(); // Hook for admin-specific redirection logic
	const [pets, setPets] = useState([]);
	const [filteredPets, setFilteredPets] = useState([]);
	const [showModal, setShowModal] = useState(false);
	const [selectedPet, setSelectedPet] = useState(null);
	const [isEditMode, setIsEditMode] = useState(false); // Track if the modal is in edit mode
	const [searchTerm, setSearchTerm] = useState('');
	const [searchType, setSearchType] = useState('');
	const [searchStatus, setSearchStatus] = useState('');
	const [filterByImages, setFilterByImages] = useState(false); // false means no filter applied, true means only show pets with images
	const uniqueTypes = [...new Set(pets.map((pet) => pet.type))];
	const uniqueStatuses = [...new Set(pets.map((pet) => pet.status))];

	useEffect(() => {
		PetService.fetchAllPets()
			.then((pets) => {
				// console.log(pets); // Check the structure of the fetched pet objects.
				setPets(pets);
				setFilteredPets(pets); // Initially, all pets are shown
			})
			.catch(console.error);
	}, []);

	useEffect(() => {
		const filtered = pets.filter(
			(pet) =>
				(searchTerm
					? pet.petName.toLowerCase().includes(searchTerm.toLowerCase())
					: true) &&
				(searchType ? pet.type === searchType : true) &&
				(searchStatus ? pet.status === searchStatus : true) &&
				(!filterByImages || (pet.images && pet.images.length > 0))
		);
		setFilteredPets(filtered);
	}, [pets, searchTerm, searchType, searchStatus, filterByImages]);

	const fetchAllPets = async () => {
		try {
			const data = await PetService.fetchAllPets();
			setPets(data);
		} catch (error) {
			console.error('Failed to fetch pets:', error);
		}
	};

	const handleEditPet = (pet) => {
		setSelectedPet(pet);
		setIsEditMode(true); // Set to edit mode
		setShowModal(true);
	};

	const handleAddPet = () => {
		setSelectedPet({}); // Reset selected pet for adding new
		setIsEditMode(false); // Set to add new mode
		setShowModal(true);
	};

	const handleDeletePet = async (id) => {
		const isConfirmed = window.confirm(
			'Are you sure you want to delete this pet?'
		);
		if (!isConfirmed) return;
		try {
			await PetService.deletePet(id);
			fetchAllPets(); // Refresh the list after deletion
		} catch {
			alert('Failed to delete pet.');
		}
	};

	const handleCloseModal = async () => {
		setShowModal(false);
		setSelectedPet(null);
	};

	return (
		<Container fluid>
			<h2>Pets</h2>
			<GenericFilterForm
				filters={[
					{
						// label: 'Pet Name',
						type: 'text',
						value: searchTerm,
						onChange: (e) => setSearchTerm(e.target.value),
						placeholder: 'Search by pet name...',
						md: 3, // Adjusted to fit the button
					},
					{
						// label: 'Pet Type',
						type: 'select',
						value: searchType,
						onChange: (e) => setSearchType(e.target.value),
						options: [
							{ value: '', label: 'All pet types' },
							...uniqueTypes.map((type) => ({ value: type, label: type })),
						],
						md: 3, // Adjusted to fit the button
					},
					{
						// label: 'Pet Status',
						type: 'select',
						value: searchStatus,
						onChange: (e) => setSearchStatus(e.target.value),
						options: [
							{ value: '', label: 'Filter by all statuses' },
							...uniqueStatuses.map((status) => ({
								value: status,
								label: status,
							})),
						],
						md: 2, // Adjusted to fit the button
					},
					{
						type: 'switch',
						label: 'Has Images',
						checked: filterByImages,
						onChange: () => setFilterByImages(!filterByImages), // Toggle the filterByImages state
						md: 2,
					},
					{
						type: 'button',
						label: 'Add Pet',
						onClick: handleAddPet,
						disabled: true,
						md: 2, // Space allocated for the button
					},
				]}
			/>
			<PetTable
				pets={filteredPets}
				onEditPet={handleEditPet}
				onDeletePet={handleDeletePet}
				canEditPet={false} // Assuming admins can edit and delete pets
				canDeletePet={true}
				isAdmin={true} // Pass true if the user is an admin, derived from your auth logic
			/>
			{showModal && (
				<PetModalForm
					show={showModal}
					handleClose={handleCloseModal}
					petDetails={selectedPet}
					setPetDetails={setSelectedPet}
					isEditMode={isEditMode}
					refreshPets={fetchAllPets}
				/>
			)}
		</Container>
	);
};

export default Pets;
