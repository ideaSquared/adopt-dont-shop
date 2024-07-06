import React from 'react';
import { Rating } from '../types/rating';

const ratingsColumns = (
	onCreateConversation: (pet_id: string, userid: string) => void
) => [
	{
		header: 'Pet Name',
		accessor: 'name',
	},
	{
		header: 'User First Name',
		accessor: 'adopter_first_name',
		render: (row: Rating) => (
			<span>
				{row.adopter_first_name} {row.adopter_last_name}
			</span>
		),
	},
	{
		header: 'Rating Type',
		accessor: 'rating_type',
		render: (row: Rating) => (
			<span
				style={{
					backgroundColor: row.rating_type === 'love' ? '#FF1493' : '#58D68D',
				}}
				className='px-2 py-1 rounded'
			>
				{row.rating_type}
			</span>
		),
	},
	{
		header: 'Actions',
		accessor: 'actions',
		render: (row: Rating) => (
			<button
				onClick={() => onCreateConversation(row.pet_id, row.userid)}
				className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
			>
				Start Conversation
			</button>
		),
	},
];

export default ratingsColumns;
