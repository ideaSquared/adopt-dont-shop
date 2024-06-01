import React, { useState } from 'react';
import PetTable from '../../components/tables/PetsTable';
import GenericFilterForm from '../../components/forms/GenericFilterForm';
import PetFormSidebar from '../../components/sidebars/PetFormSidebar';
import { useFilteredPets } from '../../hooks/useFilteredPets';
import { Pet } from '../../types/pet';
import { Rescue } from '../../types/rescue';
import PetService from '../../services/PetService';

interface PetsProps {
	rescueProfile: Rescue | null;
}

const Pets: React.FC<PetsProps> = ({ rescueProfile }) => {
	const [showSidebar, setShowSidebar] = useState(false);
	const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
	const [isEditMode, setIsEditMode] = useState(false);

	const handleCloseSidebar = () => {
		setShowSidebar(false);
		setSelectedPet(null);
		setIsEditMode(false);
	};

	const handleOpenSidebar = (pet?: Pet) => {
		if (pet) {
			setSelectedPet(pet);
			setIsEditMode(true);
		} else {
			setSelectedPet({
				pet_id: '',
				name: '',
				age: 0,
				gender: '',
				status: '',
				type: '',
				breed: '',
				short_description: '',
				long_description: '',
				vaccination_status: '',
				temperament: '',
				health: '',
				size: '',
				grooming_needs: '',
				training_socialization: '',
				commitment_level: '',
				other_pets: '',
				household: '',
				energy: '',
				family: '',
				images: [],
			});
			setIsEditMode(false);
		}
		setShowSidebar(true);
	};

	// Ensure rescueProfile is not null before proceeding
	if (!rescueProfile) {
		return <p>Rescue profile not available.</p>;
	}

	const {
		filteredPets,
		isLoading,
		error,
		filterCriteria,
		handleFilterChange,
		refreshPets,
	} = useFilteredPets(rescueProfile.rescue_id);

	const handleEditPet = (pet: Pet) => {
		handleOpenSidebar(pet);
	};

	const handleDeletePet = async (petId: string) => {
		try {
			await PetService.deletePet(petId);
			refreshPets();
		} catch (error) {
			console.error('Failed to delete pet:', error);
		}
	};

	return (
		<div>
			<h2 className='text-xl mb-4'>Pets</h2>
			{isLoading ? (
				<p>Loading...</p>
			) : error ? (
				<p>Error: {error.message}</p>
			) : (
				<>
					<GenericFilterForm
						filters={[
							{
								type: 'text',
								placeholder: 'Search by pet name...',
								value: filterCriteria.searchTerm,
								onChange: handleFilterChange('searchTerm'),
							},
							{
								type: 'select',
								value: filterCriteria.searchType,
								onChange: handleFilterChange('searchType'),
								options: [
									{ value: '', label: 'All pet types' },
									...Array.from(
										new Set(filteredPets.map((pet) => pet.type))
									).map((type) => ({
										value: type || '', // Ensure the value is a string
										label: type || '', // Ensure the label is a string
									})),
								],
							},
							{
								type: 'select',
								value: filterCriteria.searchStatus,
								onChange: handleFilterChange('searchStatus'),
								options: [
									{ value: '', label: 'Filter by all statuses' },
									...Array.from(
										new Set(filteredPets.map((pet) => pet.status))
									).map((status) => ({
										value: status || '', // Ensure the value is a string
										label: status || '', // Ensure the label is a string
									})),
								],
							},
							{
								type: 'switch',
								id: 'filter-by-images-switch',
								name: 'filterByImages', // Added missing name property
								label: 'Has Images',
								checked: filterCriteria.filterByImages,
								onChange: handleFilterChange('filterByImages'),
							},
						]}
					/>
					<PetTable
						pets={filteredPets}
						onEditPet={handleEditPet}
						onDeletePet={handleDeletePet}
						canEditPet={true}
						canDeletePet={true}
						isAdmin={false}
					/>
				</>
			)}
			{selectedPet && (
				<PetFormSidebar
					show={showSidebar}
					handleClose={handleCloseSidebar}
					petDetails={selectedPet}
					setPetDetails={setSelectedPet}
					isEditMode={isEditMode}
					refreshPets={refreshPets} // Pass the refreshPets function here
				/>
			)}
		</div>
	);
};

export default Pets;
