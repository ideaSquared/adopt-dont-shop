import React from 'react';
import { Application } from '../services/ApplicationsService';

const applicationsColumns = (
	handleViewApplication: (application: Application) => void,
	handleApprove: (id: string) => Promise<void>,
	handleReject: (id: string) => Promise<void>
) => [
	{
		header: 'First name',
		accessor: 'first_name',
	},
	{
		header: 'Pet name',
		accessor: 'pet_name',
	},
	{
		header: 'Description',
		accessor: 'description',
	},
	{
		header: 'Status',
		accessor: 'status',
	},
	{
		header: 'Actioned by',
		accessor: 'actioned_by_name',
	},
	{
		header: 'Actions',
		accessor: 'actions',
		render: (row: Application) => (
			<>
				<button
					onClick={() => handleViewApplication(row)}
					className='bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded mr-2'
				>
					View
				</button>
				{row.status === 'pending' && (
					<>
						<button
							onClick={() => handleApprove(row.application_id)}
							className='bg-green-500 hover:bg-green-700 text-white py-2 px-4 rounded mr-2'
						>
							Approve
						</button>
						<button
							onClick={() => handleReject(row.application_id)}
							className='bg-red-500 hover:bg-red-700 text-white py-2 px-4 rounded'
						>
							Reject
						</button>
					</>
				)}
			</>
		),
	},
];

export default applicationsColumns;
