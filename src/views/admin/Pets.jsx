import React, { useState, useEffect } from 'react';
import { useAdminRedirect } from '../../hooks/useAdminRedirect';
import PetTable from '../../components/tables/PetsTable';
import PetService from '../../services/PetService';
import GenericFilterForm from '../../components/forms/GenericFilterForm';
import PetFormSidebar from '../../components/sidebars/PetFormSidebar';

const Pets = () => {
	useAdminRedirect();
	const [pets, setPets] = useState([]);
	const [filteredPets, setFilteredPets] = useState([]);
	const [showModal, setShowModal] = useState(false);
	const [selectedPet, setSelectedPet] = useState(null);
	const [isEditMode, setIsEditMode] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [searchType, setSearchType] = useState('');
	const [searchStatus, setSearchStatus] = useState('');
	const [filterByImages, setFilterByImages] = useState(false);
	const uniqueTypes = [...new Set(pets.map((pet) => pet.type))];
	const uniqueStatuses = [...new Set(pets.map((pet) => pet.status))];

	useEffect(() => {
		PetService.fetchAllPets()
			.then((pets) => {
				setPets(pets);
				setFilteredPets(pets);
			})
			.catch(console.error);
	}, []);

	useEffect(() => {
		const filtered = pets.filter(
			(pet) =>
				(searchTerm
					? pet.name.toLowerCase().includes(searchTerm.toLowerCase())
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
		setIsEditMode(true);
		setShowModal(true);
	};

	const handleAddPet = () => {
		setSelectedPet({});
		setIsEditMode(false);
		setShowModal(true);
	};

	const handleDeletePet = async (id) => {
		const isConfirmed = window.confirm(
			'Are you sure you want to delete this pet?'
		);
		if (!isConfirmed) return;

		try {
			await PetService.deletePet(id);
			setPets((prevPets) => prevPets.filter((pet) => pet.pet_id !== id));
			setFilteredPets((prevPets) =>
				prevPets.filter((pet) => pet.pet_id !== id)
			);
		} catch {
			alert('Failed to delete pet.');
		}
	};

	const handleCloseModal = async () => {
		setShowModal(false);
		setSelectedPet(null);
	};

	return (
		<div className='container mx-auto my-4'>
			<h2 className='text-2xl font-bold mb-4'>Pets</h2>
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
						onClick: handleAddPet,
						disabled: true,
						md: 2,
					},
				]}
			/>
			<PetTable
				pets={filteredPets}
				onEditPet={handleEditPet}
				onDeletePet={handleDeletePet}
				canEditPet={false}
				canDeletePet={true}
				isAdmin={true}
			/>
			{showModal && (
				<PetFormSidebar
					show={showModal}
					handleClose={handleCloseModal}
					petDetails={selectedPet}
					setPetDetails={setSelectedPet}
					isEditMode={isEditMode}
					refreshPets={fetchAllPets}
				/>
			)}
		</div>
	);
};

export default Pets;
