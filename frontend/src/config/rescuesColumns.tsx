import React from 'react';
import { Rescue } from '../types/rescue';

const rescuesColumns = (
	onShowDetails: (id: string) => void,
	onDeleteRescue: (id: string) => void
) => [
	{
		header: 'Rescue Name',
		accessor: 'rescueName',
	},
	{
		header: 'Rescue Type',
		accessor: 'rescueType',
	},
	{
		header: 'Actions',
		accessor: 'actions',
		render: (row: Rescue) => (
			<div>
				<button
					onClick={() => onShowDetails(row.rescue_id)}
					className='text-indigo-600 hover:text-indigo-900'
				>
					Details
				</button>
				<button
					onClick={() => onDeleteRescue(row.rescue_id)}
					className='text-red-600 hover:text-red-900 ml-4'
				>
					Delete
				</button>
			</div>
		),
	},
];

export default rescuesColumns;
