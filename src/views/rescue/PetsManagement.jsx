import React, { useState, useEffect } from 'react';
import { Button, Container } from 'react-bootstrap';
import PaginationControls from '../../components/common/PaginationControls';
import PetTable from '../../components/tables/PetsTable';
import PetModalForm from '../../components/modals/PetModalForm';
import GenericFilterForm from '../../components/forms/GenericFilterForm';
import {
	fetchPets,
	createOrUpdatePet,
	deletePet,
} from '../../services/PetService';

const PetManagement = ({ rescueId, canAddPet, canEditPet, canDeletePet }) => {
	const [allPets, setAllPets] = useState([]);
	const [filteredPets, setFilteredPets] = useState([]);

	const [showPetModal, setShowPetModal] = useState(false);
	const [editingPet, setEditingPet] = useState({});
	const [isEditMode, setIsEditMode] = useState(false);

	const [currentPage, setCurrentPage] = useState(1);
	const [searchTerm, setSearchTerm] = useState('');
	const [searchType, setSearchType] = useState('');
	const [searchStatus, setSearchStatus] = useState('');

	const uniqueTypes = [...new Set(allPets.map((pet) => pet.type))];
	const uniqueStatuses = [...new Set(allPets.map((pet) => pet.status))];

	useEffect(() => {
		if (rescueId) {
			fetchPets(rescueId)
				.then((pets) => {
					console.log(pets); // Check the structure of the fetched pet objects.
					setAllPets(pets);
					setFilteredPets(pets); // Initially, all pets are shown
				})
				.catch(console.error);
		}
	}, [rescueId]);

	useEffect(() => {
		const filtered = allPets.filter(
			(pet) =>
				(searchTerm
					? pet.petName.toLowerCase().includes(searchTerm.toLowerCase())
					: true) &&
				(searchType ? pet.type === searchType : true) &&
				(searchStatus ? pet.status === searchStatus : true) // Implement status filtering here
		);
		setFilteredPets(filtered);
	}, [allPets, searchTerm, searchType, searchStatus]); // Add searchStatus to the dependency array

	const openEditModal = (pet) => {
		setEditingPet(pet);
		setIsEditMode(true);
		setShowPetModal(true);
	};

	const handleAddPetClick = () => {
		setShowPetModal(true);
		setIsEditMode(false);
		setEditingPet({ ownerId: rescueId }); // Assuming `ownerId` is necessary for a new pet
	};

	const closeModal = () => setShowPetModal(false);

	const handlePetChange = (e) => {
		const { name, value } = e.target;
		setEditingPet((prev) => updatePetDetails(prev, name, value));
	};

	// Function to update pet details. It separates concerns for nested and non-nested updates.
	function updatePetDetails(pet, fieldName, value) {
		// Clone the pet object to avoid direct state mutations
		const updatedPet = { ...pet };

		if (fieldName.includes('.')) {
			// For nested fields, use a utility function to perform the update
			updateNestedFields(updatedPet, fieldName, value);
		} else {
			// Direct update for non-nested fields
			updatedPet[fieldName] = value;
		}

		return updatedPet;
	}

	// Utility function to handle updates to nested fields
	function updateNestedFields(obj, path, value) {
		const levels = path.split('.');
		let current = obj;
		for (let i = 0; i < levels.length - 1; i++) {
			// If the key doesn't exist or isn't an object, initialize it
			if (!current[levels[i]] || typeof current[levels[i]] !== 'object') {
				current[levels[i]] = {};
			}
			current = current[levels[i]];
		}
		// Set the value for the final level
		current[levels[levels.length - 1]] = value;
	}

	const handlePetSubmit = async (event) => {
		event.preventDefault();
		await createOrUpdatePet(editingPet, isEditMode)
			.then(() => {
				fetchPets(rescueId).then(setPets).catch(console.error);
				closeModal();
			})
			.catch(console.error);
	};

	const handlePetDelete = async (petId) => {
		await deletePet(petId)
			.then(() => fetchPets(rescueId).then(setPets).catch(console.error))
			.catch(console.error);
	};

	return (
		<div>
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
						md: 3, // Adjusted to fit the button
					},
					{
						type: 'button',
						label: 'Add Pet',
						onClick: handleAddPetClick,
						disabled: !canAddPet,
						md: 3, // Space allocated for the button
					},
				]}
			/>

			<PetTable
				pets={filteredPets}
				currentPage={currentPage}
				searchTerm={searchTerm}
				canEditPet={canEditPet}
				canDeletePet={canDeletePet}
				onEditPet={openEditModal}
				onDeletePet={handlePetDelete}
			/>
			<PaginationControls
				currentPage={currentPage}
				totalPages={Math.ceil(filteredPets.length / 10)} // Assuming 10 pets per page
				onChangePage={setCurrentPage}
			/>

			<PetModalForm
				show={showPetModal}
				handleClose={closeModal}
				handleFormSubmit={handlePetSubmit}
				petDetails={editingPet}
				isEditMode={isEditMode}
				handlePetChange={handlePetChange}
			/>
		</div>
	);
};

export default PetManagement;
