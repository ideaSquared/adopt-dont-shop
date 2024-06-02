import React, { ChangeEvent } from 'react';
import { useLocation } from 'react-router-dom';
import RescuesTable from '../../components/tables/RescuesTable';
import { useRescues } from '../../hooks/useRescues';
import { useAdminRedirect } from '../../hooks/useAdminRedirect';
import { useAuth } from '../../contexts/AuthContext';

const Rescues: React.FC = () => {
	const { authState } = useAuth();
	useAdminRedirect();
	const location = useLocation();
	const canAdd = true;

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
			{/* <RescueDetailsModal
        showModal={showModal}
        handleClose={handleCloseModal}
        rescueDetails={selectedRescueDetails}
        onDeleteStaff={handleDeleteStaff}
      /> */}
		</div>
	);
};

export default Rescues;
