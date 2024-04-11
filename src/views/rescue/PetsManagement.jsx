import React, { useState, useEffect } from 'react';
import { Button, Container } from 'react-bootstrap';
import PaginationControls from '../../components/common/PaginationControls';
import PetTable from '../../components/tables/PetsTable';
import PetModalForm from '../../components/modals/PetModalForm';
import GenericFilterForm from '../../components/forms/GenericFilterForm';
import PetService from '../../services/PetService';

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
	const [filterByImages, setFilterByImages] = useState(false); // false means no filter applied, true means only show pets with images

	const uniqueTypes = [...new Set(allPets.map((pet) => pet.type))];
	const uniqueStatuses = [...new Set(allPets.map((pet) => pet.status))];
	const [isLoadingPetDetails, setIsLoadingPetDetails] = useState(false);
	const [editError, setEditError] = useState(null);

	useEffect(() => {
		if (rescueId) {
			PetService.fetchPets(rescueId)
				.then((pets) => {
					// console.log(pets); // Check the structure of the fetched pet objects.
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
				(searchStatus ? pet.status === searchStatus : true) &&
				(!filterByImages || (pet.images && pet.images.length > 0))
		);
		setFilteredPets(filtered);
	}, [allPets, searchTerm, searchType, searchStatus, filterByImages]);

	useEffect(() => {
		refreshPets(); // Call refreshPets directly
	}, [rescueId]);

	const refreshPets = () => {
		PetService.fetchPets(rescueId)
			.then((pets) => {
				setAllPets(pets);
				setFilteredPets(pets); // Apply any active filters if necessary
			})
			.catch(console.error);
	};

	const openEditModal = async (pet) => {
		if (!pet || !pet._id) {
			console.error('Pet or Pet ID is undefined');
			setEditError('Failed to load pet details. Please try again.');
			return; // Exit the function if pet is undefined
		}

		setEditingPet(pet); // Use the initial pet details
		setIsEditMode(true);
		setShowPetModal(true);
		setIsLoadingPetDetails(true); // Indicate loading start
		setEditError(null); // Reset any previous errors

		try {
			const testPet = await PetService.getPetById(pet._id);
			// console.log(testPet);
			setEditingPet(testPet.data); // Update with fetched details
		} catch (error) {
			console.error('Failed to fetch pet details:', error);
			setEditError(
				'Failed to load the latest pet details. Editing with available data.'
			);
		} finally {
			setIsLoadingPetDetails(false); // Loading complete
		}
	};

	const handleAddPetClick = () => {
		setShowPetModal(true);
		setIsEditMode(false);
		setEditingPet({ ownerId: rescueId });
	};

	const closeModal = () => {
		setShowPetModal(false);
		setEditingPet({});
	};

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

	// const handlePetSubmit = async (event) => {
	// 	event.preventDefault();
	// 	await createOrUpdatePet(editingPet, isEditMode)
	// 		.then(() => {
	// 			fetchPets(rescueId).then(setAllPets).catch(console.error);
	// 			closeModal();
	// 		})
	// 		.catch(console.error);
	// };

	const handlePetDelete = async (petId) => {
		await PetService.deletePet(petId)
			.then(() =>
				PetService.fetchPets(rescueId).then(setAllPets).catch(console.error)
			)
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
						onClick: handleAddPetClick,
						disabled: !canAddPet,
						md: 2, // Space allocated for the button
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
				petDetails={editingPet}
				setPetDetails={setEditingPet}
				isEditMode={isEditMode}
				handlePetChange={handlePetChange}
				refreshPets={refreshPets}
				createOrUpdatePet={PetService.createOrUpdatePet}
			/>
		</div>
	);
};

export default PetManagement;
