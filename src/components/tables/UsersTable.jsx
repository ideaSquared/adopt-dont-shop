import React from 'react';
import PaginationControls from '../common/PaginationControls';
import StatusBadge from '../common/StatusBadge';

const UsersTable = ({
	currentUsers,
	onResetPassword,
	onDeleteUser,
	currentPage,
	totalPages,
	onChangePage,
}) => {
	return (
		<>
			<div className='overflow-x-auto'>
				<table className='table-auto w-full'>
					<thead>
						<tr>
							<th>User ID</th>
							<th>First name</th>
							<th>Last name</th>
							<th>Email</th>
							<th>City</th>
							<th>Country</th>
							<th>Flags</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{currentUsers.map((user) => (
							<tr key={user.user_id} className='hover:bg-gray-100'>
								<td>{user.user_id}</td>
								<td>{user.first_name}</td>
								<td>{user.last_name}</td>
								<td>{user.email}</td>
								<td>{user.city || ''}</td>
								<td>{user.country || ''}</td>
								<td>
									{user.reset_token_force_flag && (
										<span className='bg-blue-500 text-white font-bold py-1 px-2 rounded mr-2'>
											Force Reset Flag
										</span>
									)}
									{user.is_admin && (
										<span className='bg-blue-500 text-white font-bold py-1 px-2 rounded'>
											Admin
										</span>
									)}
								</td>
								<td>
									<button
										className='bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded me-2'
										onClick={() => onResetPassword(user.user_id)}
									>
										Reset Password
									</button>
									<button
										className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
										onClick={() => onDeleteUser(user.user_id)}
									>
										Delete
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={onChangePage}
			/>
		</>
	);
};

export default UsersTable;
