import { useState, useEffect } from 'react';
import axios from 'axios';
import { Pet } from '../types/pet';

interface RatedPet extends Pet {
	rating_type: 'like' | 'love';
}

interface ErrorResponse {
	status: number;
	message: string;
}

export const useFetchRatedPets = () => {
	const [ratedPets, setRatedPets] = useState<RatedPet[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<ErrorResponse | null>(null);

	useEffect(() => {
		const fetchRatedPets = async () => {
			setIsLoading(true);
			try {
				const response = await axios.get<RatedPet[]>(
					`${import.meta.env.VITE_API_BASE_URL}/ratings/find-rated`,
					{
						withCredentials: true,
					}
				);
				// Sort pets: 'love' first, then 'like'
				const sortedPets = response.data.sort((a, b) => {
					if (a.rating_type === 'love' && b.rating_type !== 'love') return -1;
					if (a.rating_type !== 'love' && b.rating_type === 'love') return 1;
					return 0;
				});
				setRatedPets(sortedPets);
			} catch (err: any) {
				setError({
					status: err.response?.status || 500,
					message: err.message || 'An unexpected error occurred',
				});
			} finally {
				setIsLoading(false);
			}
		};

		fetchRatedPets();
	}, []);

	return { ratedPets, isLoading, error };
};
