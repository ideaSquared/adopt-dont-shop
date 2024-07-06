import React from 'react';
import { Pet } from '../types/pet';

const petColumns = (
	handleEditPet: (pet: Pet) => void,
	handleDeletePet: (petId: string) => void,
	handleApplicationClick: (petId: string) => void
) => [
	{
		header: 'Image',
		accessor: 'images',
		render: (row: Pet) => (
			<img
				src={
					row.images && row.images.length > 0
						? `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/${
								row.images[0]
						  }`
						: 'https://placehold.it/500x500'
				}
				alt={`Image of ${row.name}`}
				className='w-24 h-24 object-cover'
			/>
		),
	},
	{
		header: 'Name',
		accessor: 'name',
	},
	{
		header: 'Type',
		accessor: 'type',
	},
	{
		header: 'Status',
		accessor: 'status',
	},
	{
		header: 'Age',
		accessor: 'age',
	},
	{
		header: 'Love',
		accessor: 'ratings.love',
	},
	{
		header: 'Like',
		accessor: 'ratings.like',
	},
	{
		header: 'Dislike',
		accessor: 'ratings.dislike',
	},
	{
		header: 'Applications',
		accessor: 'application_count',
		render: (row: Pet) => (
			<span
				onClick={() => handleApplicationClick(row.pet_id)}
				className='cursor-pointer text-blue-500'
			>
				{row.application_count || 0}
			</span>
		),
	},
	{
		header: 'Actions',
		accessor: 'actions',
		render: (row: Pet) => (
			<div>
				<button
					className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2'
					onClick={() => handleEditPet(row)}
				>
					Edit
				</button>
				<button
					className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
					onClick={() => handleDeletePet(row.pet_id)}
				>
					Delete
				</button>
			</div>
		),
	},
];

export default petColumns;
