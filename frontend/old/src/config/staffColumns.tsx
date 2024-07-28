import React from 'react';
import { StaffMember } from '../types/rescue';

interface PermissionCategories {
	[category: string]: string[];
}

interface PermissionNames {
	[permission: string]: string;
}

const staffColumns = (
	verifyStaff: (user_id: string) => void,
	removeStaff: (user_id: string) => void,
	updatePermissions: (
		user_id: string,
		permission: string,
		value: boolean
	) => void,
	canEdit: boolean,
	permissionCategories: PermissionCategories,
	permissionNames: PermissionNames,
	user_id: string
) => [
	{
		header: 'Staff Email',
		accessor: 'email',
	},
	...Object.entries(permissionCategories).flatMap(([category, permissions]) => [
		{
			header:
				category.charAt(0).toUpperCase() +
				category.slice(1).replace(/([A-Z])/g, ' $1'),
			colSpan: permissions.length,
			accessor: category,
			render: () => null,
		},
		...permissions.map((permission) => ({
			header: permissionNames[permission],
			accessor: permission,
			render: (row: StaffMember) => (
				<input
					type='checkbox'
					checked={
						row.permissions ? row.permissions.includes(permission) : false
					}
					onChange={(e) =>
						updatePermissions(row.userId, permission, e.target.checked)
					}
					disabled={row.userId === user_id || !canEdit}
					className='form-checkbox h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500'
				/>
			),
		})),
	]),
	{
		header: 'Actions',
		accessor: 'actions',
		render: (row: StaffMember) => (
			<div>
				{row.verified_by_rescue ? (
					<button
						className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
						disabled
					>
						Verified
					</button>
				) : (
					<button
						className='bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded'
						onClick={() => verifyStaff(row.userId)}
						disabled={!canEdit}
					>
						Verify
					</button>
				)}
				<button
					className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
					onClick={() => removeStaff(row.userId)}
					disabled={!canEdit}
				>
					Remove
				</button>
			</div>
		),
	},
];

export default staffColumns;
