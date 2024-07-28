import React from 'react';
import { Conversation } from '../types/conversation';

const conversationsColumns = (
	handleDetailsClick: (conversation: Conversation) => void,
	onDelete: (id: string) => void
) => [
	{
		header: 'Participants',
		accessor: 'participant_emails',
		render: (row: Conversation) => (
			<div>
				{row.participant_emails && row.participant_emails.length > 0
					? row.participant_emails.join(', ')
					: 'No participants'}
				<br />
				{row.participant_rescues && row.participant_rescues.length > 0
					? row.participant_rescues.join(', ')
					: 'No rescues'}
			</div>
		),
	},
	{
		header: 'Status',
		accessor: 'status',
	},
	{
		header: 'Actions',
		accessor: 'actions',
		render: (row: Conversation) => (
			<div>
				<button
					onClick={() => handleDetailsClick(row)}
					className='text-indigo-600 hover:text-indigo-900'
				>
					Details
				</button>
				<button
					onClick={() => onDelete(row.conversation_id)}
					className='text-red-600 hover:text-red-900 ml-4'
				>
					Delete
				</button>
			</div>
		),
	},
];

export default conversationsColumns;
