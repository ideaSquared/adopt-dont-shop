import React, { useState, useEffect } from 'react';
import {
	FormInput,
	SelectInput,
	TextInput,
	Table,
} from '@adoptdontshop/components';
import { Rating, RatingService, RatingType } from '@adoptdontshop/libs/ratings';

const Ratings: React.FC = () => {
	const [ratings, setRatings] = useState<Rating[]>([]);
	const [filteredRatings, setFilteredRatings] = useState<Rating[]>([]);
	const [searchTerm, setSearchTerm] = useState<string | null>(null);
	const [filterByType, setFilterByType] = useState<RatingType | null>(null);

	useEffect(() => {
		const fetchedRatings = RatingService.getRatings();
		setRatings(fetchedRatings);
		setFilteredRatings(fetchedRatings);
	}, []);

	useEffect(() => {
		const filtered = ratings.filter((rating) => {
			const matchesSearch =
				!searchTerm ||
				rating.pet_id.includes(searchTerm) ||
				rating.user_id.includes(searchTerm);
			const matchesType = !filterByType || rating.type === filterByType;
			return matchesSearch && matchesType;
		});
		setFilteredRatings(filtered);
	}, [searchTerm, filterByType, ratings]);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	const handleFilterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setFilterByType(e.target.value as RatingType);
	};

	const ratingTypes: RatingType[] = ['LIKE', 'LOVE', 'DISLIKE'];

	const handleTypeToSentenceCase = (type: string) => {
		return type.charAt(0) + type.slice(1).toLowerCase();
	};

	const typeOptions = [
		{ value: '', label: 'All types' },
		...ratingTypes.map((type) => ({
			value: type,
			label: handleTypeToSentenceCase(type),
		})),
	];

	return (
		<div>
			<h1>Ratings</h1>
			<FormInput label='Search by pet ID or user ID'>
				<TextInput
					onChange={handleSearchChange}
					type='text'
					value={searchTerm || ''}
				/>
			</FormInput>
			<FormInput label='Filter by rating type'>
				<SelectInput
					onChange={handleFilterTypeChange}
					value={filterByType || ''}
					options={typeOptions}
				/>
			</FormInput>
			<Table striped>
				<thead>
					<tr>
						<th>Pet ID</th>
						<th>User ID</th>
						<th>Rating Type</th>
						<th>Timestamp</th>
					</tr>
				</thead>
				<tbody>
					{filteredRatings.map((rating) => (
						<tr
							key={`${rating.pet_id}-${
								rating.user_id
							}-${rating.timestamp.getTime()}`}
						>
							<td>{rating.pet_id}</td>
							<td>{rating.user_id}</td>
							<td>{handleTypeToSentenceCase(rating.type)}</td>
							<td>{rating.timestamp.toLocaleString()}</td>
						</tr>
					))}
				</tbody>
			</Table>
		</div>
	);
};

export default Ratings;
