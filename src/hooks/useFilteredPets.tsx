import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import PetService from '../services/PetService';
import { Pet } from '../types/pet';
import { ErrorResponse } from '../types/error';

interface FilterCriteria {
	searchTerm: string;
	searchType: string;
	searchStatus: string;
	filterByImages: boolean;
}

export const useFilteredPets = (rescueId: string | null, isAdmin: boolean) => {
	const [pets, setPets] = useState<Pet[]>([]);
	const [filteredPets, setFilteredPets] = useState<Pet[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<ErrorResponse | null>(null);
	const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
		searchTerm: '',
		searchType: '',
		searchStatus: '',
		filterByImages: false,
	});

	const fetchPets = useCallback(async () => {
		setIsLoading(true);
		try {
			const petsData = isAdmin
				? await PetService.fetchAllPets()
				: rescueId
				? await PetService.fetchPets(rescueId)
				: [];
			setPets(petsData);
			setFilteredPets(petsData);
		} catch (err: any) {
			console.error('Error fetching pets:', err);
			setError({
				status: err.response?.status || 500,
				message: err.message || 'An unexpected error occurred',
			});
		} finally {
			setIsLoading(false);
		}
	}, [rescueId, isAdmin]);

	useEffect(() => {
		fetchPets();
	}, [fetchPets]);

	useEffect(() => {
		const filtered = pets.filter((pet) => {
			const nameMatch = filterCriteria.searchTerm
				? pet.name
						.toLowerCase()
						.includes(filterCriteria.searchTerm.toLowerCase())
				: true;
			const typeMatch = filterCriteria.searchType
				? pet.type === filterCriteria.searchType
				: true;
			const statusMatch = filterCriteria.searchStatus
				? pet.status === filterCriteria.searchStatus
				: true;
			const imageMatch = filterCriteria.filterByImages
				? pet.images && pet.images.length > 0
				: true;

			return nameMatch && typeMatch && statusMatch && imageMatch;
		});
		setFilteredPets(filtered);
	}, [pets, filterCriteria]);

	const handleFilterChange =
		(field: keyof FilterCriteria) =>
		(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			const value =
				field === 'filterByImages' && event.target instanceof HTMLInputElement
					? event.target.checked
					: event.target.value;
			setFilterCriteria({ ...filterCriteria, [field]: value });
		};

	return {
		pets,
		filteredPets,
		isLoading,
		error,
		filterCriteria,
		handleFilterChange,
		refreshPets: fetchPets, // Return the fetchPets function as refreshPets
	};
};
