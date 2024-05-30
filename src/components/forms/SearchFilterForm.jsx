import React from 'react';

const SearchFilterForm = ({
	searchTerm,
	setSearchTerm,
	filterCriteria,
	setFilterCriteria,
}) => {
	return (
		<div className='flex flex-col md:flex-row items-center justify-between mb-3 space-y-4 md:space-y-0 md:space-x-4'>
			<div className='w-full'>
				<label
					htmlFor='searchTerm'
					className='block text-sm font-medium text-gray-700'
				>
					Search by pet name
				</label>
				<input
					type='text'
					id='searchTerm'
					placeholder='Search by pet name...'
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
				/>
			</div>
			<div className='w-full'>
				<label
					htmlFor='filterCriteria'
					className='block text-sm font-medium text-gray-700'
				>
					Filter Criteria
				</label>
				<select
					id='filterCriteria'
					value={filterCriteria}
					onChange={(e) => setFilterCriteria(e.target.value)}
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
				>
					<option value=''>All Criteria</option>
					<option value='like'>Like</option>
					<option value='love'>Love</option>
				</select>
			</div>
		</div>
	);
};

export default SearchFilterForm;
