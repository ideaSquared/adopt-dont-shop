import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import RatingsTable from '../../components/tables/RatingsTable';
import GenericFilterForm from '../../components/forms/GenericFilterForm';
import RescueService from '../../services/RescueService';

const AdopterManagement = ({ rescueId }) => {
	const [ratings, setRatings] = useState([]);
	const [filteredRatings, setFilteredRatings] = useState([]); // State to hold the filtered ratings
	const [searchTerm, setSearchTerm] = useState('');
	const [filterCriteria, setFilterCriteria] = useState('');

	useEffect(() => {
		if (rescueId) {
			RescueService.fetchRatings(rescueId)
				.then((data) => {
					setRatings(data);
					setFilteredRatings(data); // Initialize with all ratings
				})
				.catch(console.error);
		}
	}, [rescueId]);

	console.log(ratings);

	useEffect(() => {
		// Filter logic
		const filtered = ratings.filter(
			(rating) =>
				(searchTerm
					? rating.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					  rating.userFirstName
							.toLowerCase()
							.includes(searchTerm.toLowerCase())
					: true) &&
				(filterCriteria ? rating.ratingType === filterCriteria : true)
		);
		setFilteredRatings(filtered);
	}, [ratings, searchTerm, filterCriteria]); // Re-apply filters when ratings or filter criteria change

	const handleCreateConversation = (petId, userId) => {
		RescueService.createConversation(rescueId, petId, userId)
			.then((data) => console.log('Conversation created:', data))
			.catch(console.error);
	};

	return (
		<div>
			<h2>Pet Ratings</h2>
			<GenericFilterForm
				filters={[
					{
						type: 'text',
						// label: 'Search by name',
						placeholder: 'Search by pet name or user first name...',
						value: searchTerm,
						onChange: (e) => setSearchTerm(e.target.value),
						md: 6,
					},
					{
						type: 'select',
						// label: 'Filter Criteria',
						value: filterCriteria,
						onChange: (e) => setFilterCriteria(e.target.value),
						options: [
							{ label: 'Filter by all criteria', value: '' },
							{ label: 'Like', value: 'like' },
							{ label: 'Love', value: 'love' },
						],
						md: 6,
					},
				]}
			/>

			<RatingsTable
				filteredRatings={filteredRatings}
				onCreateConversation={handleCreateConversation}
			/>
		</div>
	);
};

export default AdopterManagement;
