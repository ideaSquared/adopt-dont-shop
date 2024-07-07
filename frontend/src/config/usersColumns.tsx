import React from 'react';
import { User } from '../types/user';

const usersColumns = (
	onResetPassword: (user_id: string) => void,
	onDeleteUser: (user_id: string) => void
) => [
	{
		header: 'ID',
		accessor: 'user_id',
	},
	{
		header: 'Email',
		accessor: 'email',
	},
	{
		header: 'First Name',
		accessor: 'first_name',
	},
	{
		header: 'Last Name',
		accessor: 'last_name',
	},
	{
		header: 'Flags',
		accessor: 'flags',
		render: (row: User) => (
			<div>
				{row.is_admin && (
					<span className='bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded'>
						Admin
					</span>
				)}
				{row.reset_token_force_flag && (
					<span className='bg-red-100 text-red-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded'>
						Forced reset
					</span>
				)}
			</div>
		),
	},
	{
		header: 'Actions',
		accessor: 'actions',
		render: (row: User) => (
			<div>
				{row.user_id && (
					<>
						<button
							onClick={() => onResetPassword(row.user_id!)}
							className='text-blue-600 hover:text-blue-900'
						>
							Reset Password
						</button>
						<button
							onClick={() => onDeleteUser(row.user_id!)}
							className='text-red-600 hover:text-red-900 ml-4'
						>
							Delete
						</button>
					</>
				)}
			</div>
		),
	},
];

export default usersColumns;
