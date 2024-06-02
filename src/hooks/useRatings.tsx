import { useState, useEffect, ChangeEvent } from 'react';
import RescueService from '../services/RescueService';
import { Rating } from '../types/rating'; // Assuming you have a Rating type defined

export const useRatings = (rescueId: string) => {
	const [ratings, setRatings] = useState<Rating[]>([]);
	const [filteredRatings, setFilteredRatings] = useState<Rating[]>([]);
	const [searchTerm, setSearchTerm] = useState<string>('');
	const [filterCriteria, setFilterCriteria] = useState<string>('');

	useEffect(() => {
		if (rescueId) {
			RescueService.fetchRatings(rescueId)
				.then((data) => {
					setRatings(data);
					setFilteredRatings(data);
				})
				.catch(console.error);
		}
	}, [rescueId]);

	useEffect(() => {
		const filtered = ratings.filter(
			(rating) =>
				(searchTerm
					? rating.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					  rating.adopter_first_name
							.toLowerCase()
							.includes(searchTerm.toLowerCase()) ||
					  rating.adopter_last_name
							.toLowerCase()
							.includes(searchTerm.toLowerCase())
					: true) &&
				(filterCriteria ? rating.rating_type === filterCriteria : true)
		);
		setFilteredRatings(filtered);
	}, [ratings, searchTerm, filterCriteria]);

	const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	const handleFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
		setFilterCriteria(e.target.value);
	};

	const handleCreateConversation = (petId: string, userId: string) => {
		RescueService.createConversation(rescueId, petId, userId)
			.then((data) => console.log('Conversation created'))
			.catch(console.error);
	};

	return {
		ratings,
		filteredRatings,
		searchTerm,
		filterCriteria,
		handleSearchChange,
		handleFilterChange,
		handleCreateConversation,
	};
};
