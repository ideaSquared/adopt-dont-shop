import React, { useState, ChangeEvent } from 'react';
import PetTable from '../../components/tables/PetsTable';
import PetFormSidebar from '../../components/sidebars/PetFormSidebar';
import { useFilteredPets } from '../../hooks/useFilteredPets';
import { Pet } from '../../types/pet';
import { Rescue, StaffMember } from '../../types/rescue';
import PetService from '../../services/PetService';

interface PetsProps {
	rescueProfile: Rescue | null;
	userPermissions: string[];
}

const Pets: React.FC<PetsProps> = ({ rescueProfile, userPermissions }) => {
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

	console.log(userPermissions);

	return (
		<div>
			<h2 className='text-xl mb-4'>Pets</h2>
			{isLoading ? (
				<p>Loading...</p>
			) : error ? (
				<p>Error: {error.message}</p>
			) : (
				<>
					<form className='space-y-4'>
						<div>
							<input
								type='text'
								placeholder='Search by pet name...'
								value={filterCriteria.searchTerm}
								onChange={(e: ChangeEvent<HTMLInputElement>) =>
									handleFilterChange('searchTerm')(e)
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							/>
						</div>
						<div>
							<select
								value={filterCriteria.searchType}
								onChange={(e: ChangeEvent<HTMLSelectElement>) =>
									handleFilterChange('searchType')(e)
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>All pet types</option>
								{Array.from(new Set(filteredPets.map((pet) => pet.type))).map(
									(type) => (
										<option key={type} value={type}>
											{type}
										</option>
									)
								)}
							</select>
						</div>
						<div>
							<select
								value={filterCriteria.searchStatus}
								onChange={(e: ChangeEvent<HTMLSelectElement>) =>
									handleFilterChange('searchStatus')(e)
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>Filter by all statuses</option>
								{Array.from(new Set(filteredPets.map((pet) => pet.status))).map(
									(status) => (
										<option key={status} value={status}>
											{status}
										</option>
									)
								)}
							</select>
						</div>
						<div className='flex items-center'>
							<label htmlFor='filter-by-images-switch' className='mr-2'>
								Has Images
							</label>
							<input
								type='checkbox'
								id='filter-by-images-switch'
								name='filterByImages'
								checked={filterCriteria.filterByImages}
								onChange={(e: ChangeEvent<HTMLInputElement>) =>
									handleFilterChange('filterByImages')(e)
								}
								className='focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded'
							/>
						</div>
					</form>
					{userPermissions?.includes('add_pet') && (
						<button
							onClick={() => handleOpenSidebar()}
							className='mt-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
						>
							Add Pet
						</button>
					)}
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
