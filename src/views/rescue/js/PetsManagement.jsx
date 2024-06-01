import React, { useState, useEffect } from 'react';
import PetTable from '../../../components/tables/PetsTable';
import GenericFilterForm from '../../../components/forms/GenericFilterForm';
import PetService from '../../../services/PetService';
import PetFormSidebar from '../../../components/sidebars/PetFormSidebar';

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
	const [filterByImages, setFilterByImages] = useState(false);

	const uniqueTypes = [...new Set(allPets.map((pet) => pet.type))];
	const uniqueStatuses = [...new Set(allPets.map((pet) => pet.status))];
	const [isLoadingPetDetails, setIsLoadingPetDetails] = useState(false);
	const [editError, setEditError] = useState(null);

	useEffect(() => {
		if (rescueId) {
			PetService.fetchPets(rescueId)
				.then((pets) => {
					setAllPets(pets);
					setFilteredPets(pets);
				})
				.catch((error) => {
					if (error.response && error.response.status === 404) {
						console.log('No pets found for this owner');
						setAllPets([]);
						setFilteredPets([]);
					} else {
						console.error(error);
					}
				});
		}
	}, [rescueId]);

	useEffect(() => {
		const filtered = allPets.filter(
			(pet) =>
				(searchTerm
					? pet.name.toLowerCase().includes(searchTerm.toLowerCase())
					: true) &&
				(searchType ? pet.type === searchType : true) &&
				(searchStatus ? pet.status === searchStatus : true) &&
				(!filterByImages || (pet.images && pet.images.length > 0))
		);
		setFilteredPets(filtered);
	}, [allPets, searchTerm, searchType, searchStatus, filterByImages]);

	useEffect(() => {
		refreshPets();
	}, [rescueId]);

	const refreshPets = () => {
		PetService.fetchPets(rescueId)
			.then((pets) => {
				setAllPets(pets);
				setFilteredPets(pets);
			})
			.catch(console.error);
	};

	const openEditModal = async (pet) => {
		if (!pet || !pet.pet_id) {
			console.error('Pet or Pet ID is undefined');
			setEditError('Failed to load pet details. Please try again.');
			return;
		}

		setEditingPet(pet);
		setIsEditMode(true);
		setShowPetModal(true);
		setIsLoadingPetDetails(true);
		setEditError(null);

		try {
			const testPet = await PetService.getPetById(pet.pet_id);
			setEditingPet(testPet.data);
		} catch (error) {
			console.error('Failed to fetch pet details:', error);
			setEditError(
				'Failed to load the latest pet details. Editing with available data.'
			);
		} finally {
			setIsLoadingPetDetails(false);
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

	function updatePetDetails(pet, fieldName, value) {
		const updatedPet = { ...pet };

		if (fieldName.includes('.')) {
			updateNestedFields(updatedPet, fieldName, value);
		} else {
			updatedPet[fieldName] = value;
		}

		return updatedPet;
	}

	function updateNestedFields(obj, path, value) {
		const levels = path.split('.');
		let current = obj;
		for (let i = 0; i < levels.length - 1; i++) {
			if (!current[levels[i]] || typeof current[levels[i]] !== 'object') {
				current[levels[i]] = {};
			}
			current = current[levels[i]];
		}
		current[levels[levels.length - 1]] = value;
	}

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
						type: 'text',
						value: searchTerm,
						onChange: (e) => setSearchTerm(e.target.value),
						placeholder: 'Search by pet name...',
						md: 3,
					},
					{
						type: 'select',
						value: searchType,
						onChange: (e) => setSearchType(e.target.value),
						options: [
							{ value: '', label: 'All pet types' },
							...uniqueTypes.map((type) => ({ value: type, label: type })),
						],
						md: 3,
					},
					{
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
						md: 2,
					},
					{
						type: 'switch',
						label: 'Has Images',
						checked: filterByImages,
						onChange: () => setFilterByImages(!filterByImages),
						md: 2,
					},
					{
						type: 'button',
						label: 'Add Pet',
						onClick: handleAddPetClick,
						disabled: !canAddPet,
						md: 2,
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

			<PetFormSidebar
				show={showPetModal}
				handleClose={closeModal}
				petDetails={editingPet}
				setPetDetails={setEditingPet}
				isEditMode={isEditMode}
				handlePetChange={handlePetChange}
				refreshPets={refreshPets}
			/>
		</div>
	);
};

export default PetManagement;
