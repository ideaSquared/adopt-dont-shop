import React from 'react';
import { Rescue } from '../../types/rescue';
import Table from '../../components/tables/Table';
import GenericFilterForm from '../../components/forms/GenericFilterForm';
import { useRatings } from '../../hooks/useRatings';
import ratingsColumns from '../../config/ratingsColumns';

interface RatingsProps {
	rescueProfile: Rescue | null;
}

const Ratings: React.FC<RatingsProps> = ({ rescueProfile }) => {
	if (!rescueProfile) {
		return <p>Rescue profile not available.</p>;
	}

	const {
		filteredRatings,
		searchTerm,
		filterCriteria,
		handleSearchChange,
		handleFilterChange,
		handleCreateConversation,
	} = useRatings(rescueProfile.rescue_id);

	const columns = ratingsColumns(handleCreateConversation);

	return (
		<div>
			<h2 className='text-xl mb-4'>Ratings</h2>
			<GenericFilterForm
				filters={[
					{
						type: 'text',
						placeholder: 'Search by pet name or user first name...',
						value: searchTerm,
						onChange: handleSearchChange,
					},
					{
						type: 'select',
						value: filterCriteria,
						onChange: handleFilterChange,
						options: [
							{ label: 'Filter by all criteria', value: '' },
							{ label: 'Like', value: 'like' },
							{ label: 'Love', value: 'love' },
						],
					},
				]}
			/>
			<Table columns={columns} data={filteredRatings} />
		</div>
	);
};

export default Ratings;
