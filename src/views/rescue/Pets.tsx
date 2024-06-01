import React from 'react';
import PetTable from '../../components/tables/PetsTable';
import GenericFilterForm from '../../components/forms/GenericFilterForm';
import { useFilteredPets } from '../../hooks/useFilteredPets';
import { Pet } from '../../types/pet';
import { Rescue } from '../../types/rescue';

interface PetsProps {
  rescueProfile: Rescue | null;
}

const Pets: React.FC<PetsProps> = ({ rescueProfile }) => {
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
  } = useFilteredPets(rescueProfile.rescue_id);

  const handleEditPet = (pet: Pet) => {
    // Logic for editing pet
    console.log('Edit pet:', pet);
  };

  const handleDeletePet = (petId: string) => {
    // Logic for deleting pet
    console.log('Delete pet with ID:', petId);
  };

  return (
    <div>
      <h2 className="text-xl mb-4">Pets</h2>
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
                  ...Array.from(new Set(filteredPets.map((pet) => pet.type))).map((type) => ({
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
                  ...Array.from(new Set(filteredPets.map((pet) => pet.status))).map((status) => ({
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
    </div>
  );
};

export default Pets;
