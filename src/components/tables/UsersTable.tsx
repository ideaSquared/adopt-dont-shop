import React from 'react';
import { User } from '../../types/user';
import PaginationControls from '../common/PaginationControls';

interface UsersTableProps {
	currentUsers: User[];
	onResetPassword: (user_id: string) => void;
	onDeleteUser: (user_id: string) => void;
	currentPage: number;
	totalPages: number;
	onChangePage: (page: number) => void;
}

const UsersTable: React.FC<UsersTableProps> = ({
	currentUsers,
	onResetPassword,
	onDeleteUser,
	currentPage,
	totalPages,
	onChangePage,
}) => {
	console.log(currentUsers);
	return (
		<div>
			<table className='table-auto w-full'>
				<thead>
					<tr>
						<td className='border px-4 py-2'>ID</td>
						<th className='border px-4 py-2'>Email</th>
						<th className='border px-4 py-2'>First Name</th>
						<th className='border px-4 py-2'>Last Name</th>
						<th className='border px-4 py-2'>Flags</th>
						<th className='border px-4 py-2'>Actions</th>
					</tr>
				</thead>
				<tbody>
					{currentUsers.map((user) => (
						<tr key={user.user_id} className='hover:bg-gray-100'>
							<td className='border px-4 py-2'>{user.user_id}</td>
							<td className='border px-4 py-2'>{user.email}</td>
							<td className='border px-4 py-2'>{user.first_name}</td>
							<td className='border px-4 py-2'>{user.last_name}</td>
							<td className='border px-4 py-2'>
								{user.is_admin && (
									<span className='bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded'>
										Admin
									</span>
								)}
								{user.reset_token_force_flag && (
									<span className='bg-red-100 text-red-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded'>
										Forced Reset
									</span>
								)}
							</td>
							<td className='border px-4 py-2'>
								<button
									onClick={() => {
										onResetPassword(user.user_id!);
									}}
									className='text-blue-600 hover:text-blue-900'
								>
									Reset Password
								</button>
								<button
									onClick={() => {
										onDeleteUser(user.user_id!);
									}}
									className='text-red-600 hover:text-red-900 ml-4'
								>
									Delete
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={onChangePage}
			/>
		</div>
	);
};

export default UsersTable;
