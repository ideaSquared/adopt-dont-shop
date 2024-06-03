import React from 'react';
import UsersTable from '../../components/tables/UsersTable';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../contexts/AuthContext';

const Users: React.FC = () => {
	const { authState } = useAuth();

	const {
		users,
		currentPage,
		totalPages,
		searchTerm,
		filterFlags,
		isLoading,
		error,
		handleSearchChange,
		handleFilterFlagChange,
		handleResetPassword,
		handleDeleteUser,
		setCurrentPage,
	} = useUsers();

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (error) {
		return <div>Error: {error}</div>;
	}

	return (
		<div className='container mx-auto my-4'>
			<div className='flex gap-4 mb-4'>
				<input
					type='text'
					placeholder='Search by Email or Name'
					value={searchTerm}
					onChange={handleSearchChange}
					className='border p-2 rounded flex-1'
				/>
				<label className='flex items-center'>
					<input
						type='checkbox'
						name='forceReset'
						checked={filterFlags.forceReset}
						onChange={handleFilterFlagChange}
						className='mr-2'
					/>
					Force Reset Flag
				</label>
				<label className='flex items-center'>
					<input
						type='checkbox'
						name='admin'
						checked={filterFlags.admin}
						onChange={handleFilterFlagChange}
						className='mr-2'
					/>
					Admin
				</label>
			</div>
			<UsersTable
				currentUsers={users}
				onResetPassword={handleResetPassword}
				onDeleteUser={handleDeleteUser}
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={setCurrentPage}
			/>
		</div>
	);
};

export default Users;
