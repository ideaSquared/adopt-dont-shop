import { useState, useEffect } from 'react';
import axios from 'axios';

export const useFetchUnratedPets = () => {
	const [pets, setPets] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [noUnratedPets, setNoUnratedPets] = useState(false);

	useEffect(() => {
		const fetchUnratedPets = async () => {
			setIsLoading(true);
			try {
				const response = await axios.get(
					`${import.meta.env.VITE_API_BASE_URL}/ratings/find-unrated`,
					{
						withCredentials: true,
					}
				);
				setPets(response.data);
				if (response.data.length === 0) {
					setNoUnratedPets(true);
				}
			} catch (err) {
				setError(err.message || 'An unexpected error occurred');
				if (err.response && err.response.status === 404) {
					setNoUnratedPets(true);
				}
			} finally {
				setIsLoading(false);
			}
		};

		fetchUnratedPets();
	}, []);

	return { pets, isLoading, error, noUnratedPets };
};
