import { useState, useEffect } from 'react';
import axios from 'axios';
import { Pet } from '../types/pet';

interface ErrorResponse {
	status: number;
	message: string;
}

export const useFetchRatedPets = () => {
	const [ratedPets, setRatedPets] = useState<Pet[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<ErrorResponse | null>(null);

	useEffect(() => {
		const fetchRatedPets = async () => {
			setIsLoading(true);
			try {
				const response = await axios.get<Pet[]>(
					`${import.meta.env.VITE_API_BASE_URL}/ratings/find-rated`,
					{
						withCredentials: true,
					}
				);
				setRatedPets(response.data);
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
