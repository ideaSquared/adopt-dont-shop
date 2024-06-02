import { useState, useEffect } from 'react';
import { Pet } from '../types/pet';
import PetService from '../services/PetService';

interface UseFetchAllPetsResult {
	pets: Pet[];
	isLoading: boolean;
	error: Error | null;
	refreshPets: () => void;
}

export const useFetchAllPets = (): UseFetchAllPetsResult => {
	const [pets, setPets] = useState<Pet[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<Error | null>(null);

	const fetchPets = async () => {
		setIsLoading(true);
		try {
			const fetchedPets = await PetService.fetchAllPets();
			setPets(fetchedPets);
			setError(null);
		} catch (err) {
			setError(err as Error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchPets();
	}, []);

	const refreshPets = () => {
		fetchPets();
	};

	return { pets, isLoading, error, refreshPets };
};
