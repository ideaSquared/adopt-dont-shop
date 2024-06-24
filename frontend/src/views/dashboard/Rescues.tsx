import React from 'react';
import RescuesTable from '../../components/tables/RescuesTable';
import { useRescues } from '../../hooks/useRescues';
import RescueDetailsSidebar from '../../components/sidebars/RescueDetailsSidebar'; // Adjust the path as necessary
import { Rescue } from '../../types/rescue'; // Ensure the path is correct

const Rescues: React.FC = () => {
	const {
		rescues,
		totalPages,
		currentPage,
		filterType,
		searchName,
		searchEmail,
		showModal,
		selectedRescueDetails,
		handleFilterTypeChange,
		handleSearchNameChange,
		handleSearchEmailChange,
		handleDeleteRescue,
		handleShowDetails,
		handleCloseModal,
		handlePageChange,
		handleDeleteStaff,
	} = useRescues();

	return (
		<div className='container mx-auto my-4'>
			<div className='flex gap-4 mb-4'>
				<select
					value={filterType}
					onChange={handleFilterTypeChange}
					className='border p-2 rounded'
				>
					<option value=''>All Types</option>
					<option value='individual'>Individual</option>
					<option value='charity'>Charity</option>
					<option value='company'>Company</option>
				</select>
				<input
					type='text'
					placeholder='Search by rescue name'
					value={searchName}
					onChange={handleSearchNameChange}
					className='border p-2 rounded'
				/>
				<input
					type='text'
					placeholder='Search by staff email'
					value={searchEmail}
					onChange={handleSearchEmailChange}
					className='border p-2 rounded'
				/>
			</div>
			<RescuesTable
				rescues={rescues}
				onDeleteRescue={handleDeleteRescue}
				onShowDetails={handleShowDetails}
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={handlePageChange}
			/>
			<RescueDetailsSidebar
				show={showModal}
				handleClose={handleCloseModal}
				rescueDetails={selectedRescueDetails as Rescue}
				onDeleteStaff={handleDeleteStaff}
			/>
		</div>
	);
};

export default Rescues;
