import React from 'react';
import Table from '../../components/tables/Table';
import { useUsers } from '../../hooks/useUsers';
import usersColumns from '../../config/usersColumns';

const Users: React.FC = () => {
	const {
		users,
		searchTerm,
		filterFlags,
		isLoading,
		error,
		handleSearchChange,
		handleFilterFlagChange,
		handleResetPassword,
		handleDeleteUser,
	} = useUsers();

	const columns = usersColumns(handleResetPassword, handleDeleteUser);

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
			<Table columns={columns} data={users} />
		</div>
	);
};

export default Users;
